import axios from "axios";
import { randomUUID } from "crypto";
import { compareTwoStrings } from "string-similarity";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";

import { db, detectionTable } from "@workspace/db";
import { hammingSimilarity, perceptualHashImage } from "../lib/piracyDetection";
import { searchWeb, scrapePage } from "./webScanner";

export type PipelineDetection = {
  id: string;
  url: string;
  matchType: "exact" | "visual" | "partial" | "paraphrase";
  confidence: number;
  excerpt: string;
  detectedAt: string;
  /** Review workflow (matches API detection status). */
  status: "pending" | "confirmed" | "dismissed";
};

const TEXT_FLAG = 0.8;
const TEXT_PARAPHRASE = 0.92;
const PHASH_HAMMING_MAX = 10;
const SCRAPE_DELAY_MS = 500;

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Hamming distance for equal-length bit strings (sharp-phash output). */
function hammingDistanceBits(a: string, b: string): number | null {
  if (!a?.length || !b?.length || a.length !== b.length) return null;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

export async function extractPlainTextSnippet(buffer: Buffer, mimeType: string, maxLen: number): Promise<string> {
  const m = mimeType.toLowerCase();
  try {
    if (m.includes("pdf")) {
      const parser = new PDFParse({ data: buffer });
      const r = await parser.getText();
      await parser.destroy().catch(() => undefined);
      return (r.text ?? "").replace(/\s+/g, " ").trim().slice(0, maxLen);
    }
    if (m.startsWith("text/") || m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const raw = buffer.toString("utf8").replace(/\s+/g, " ").trim();
      return raw.slice(0, maxLen);
    }
  } catch (e) {
    console.warn("[piracyPipeline] extractPlainTextSnippet:", (e as any)?.message ?? e);
  }
  return "";
}

async function extractPlainTextFull(buffer: Buffer, mimeType: string): Promise<string> {
  const m = mimeType.toLowerCase();
  if (m.includes("pdf")) {
    const parser = new PDFParse({ data: buffer });
    const r = await parser.getText();
    await parser.destroy().catch(() => undefined);
    return (r.text ?? "").replace(/\s+/g, " ").trim();
  }
  if (m.startsWith("text/")) return buffer.toString("utf8").replace(/\s+/g, " ").trim();
  return "";
}

export function normalizeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

function dedupeByUrl(items: PipelineDetection[]): PipelineDetection[] {
  const seen = new Set<string>();
  const out: PipelineDetection[] = [];
  for (const it of items) {
    const k = it.url.split("#")[0];
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

/**
 * Multi-layer piracy scan: hash/CID exact signals, NLP text similarity, perceptual hash on page images.
 * Runs async after upload — does not block the HTTP response.
 */
export async function runPiracyDetectionPipeline(args: {
  supabase: SupabaseClient | null;
  contentId: string;
  userId: string;
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  sha256: string;
  ipfsCid: string;
  perceptualHash: string | null;
}): Promise<void> {
  const { supabase, contentId, userId, fileName, buffer, mimeType, sha256, ipfsCid, perceptualHash } = args;
  const results: PipelineDetection[] = [];
  const now = () => new Date().toISOString();

  try {
    const plain = await extractPlainTextFull(buffer, mimeType);
    const snippet = plain.slice(0, 280);

    // --- A) Exact: search for hash / IPFS CID in indexed pages ---
    const exactQuery = `${sha256.slice(0, 32)} OR "${ipfsCid}"`;
    const exactUrls = await searchWeb(exactQuery);
    for (const url of exactUrls.slice(0, 4)) {
      await delay(SCRAPE_DELAY_MS);
      const page = await scrapePage(url);
      if (!page) continue;
      const blob = `${page.text} ${url}`;
      if (blob.includes(sha256) || blob.includes(ipfsCid)) {
        results.push({
          id: randomUUID(),
          url,
          matchType: "exact",
          confidence: 0.99,
          excerpt: `Fingerprint or CID reference found (${fileName}).`,
          detectedAt: now(),
          status: "pending",
        });
      }
    }

    // --- B) Text: Google + NLP similarity ---
    const q = snippet.length > 20 ? `"${fileName}" ${snippet.slice(0, 120)}` : `"${fileName}"`;
    const textUrls = await searchWeb(q);
    const seenUrl = new Set(results.map((r) => r.url));

    for (const url of textUrls) {
      if (results.length >= 20) break;
      if (seenUrl.has(url)) continue;
      await delay(SCRAPE_DELAY_MS);
      const page = await scrapePage(url);
      if (!page?.text.length) continue;

      const sim = compareTwoStrings(plain.slice(0, 12_000), page.text.slice(0, 12_000));
      if (sim > TEXT_FLAG) {
        seenUrl.add(url);
        const matchType = sim >= TEXT_PARAPHRASE ? "paraphrase" : "partial";
        results.push({
          id: randomUUID(),
          url,
          matchType,
          confidence: Math.min(0.999, sim),
          excerpt: page.text.slice(0, 320),
          detectedAt: now(),
          status: "pending",
        });
      }
    }

    // --- C) Perceptual: compare pHash to og:image / img (images + rasterized targets only when we have pHash) ---
    if (perceptualHash) {
      for (const url of textUrls.slice(0, 6)) {
        if (results.length >= 22) break;
        await delay(SCRAPE_DELAY_MS);
        const page = await scrapePage(url);
        if (!page?.imageUrls.length) continue;

        for (const imgUrl of page.imageUrls.slice(0, 3)) {
          try {
            const { data, status } = await axios.get<ArrayBuffer>(imgUrl, {
              responseType: "arraybuffer",
              timeout: 10_000,
              maxContentLength: 4_000_000,
              validateStatus: (s) => s === 200,
            });
            if (status !== 200) continue;
            const imgBuf = Buffer.from(data);
            const h = await perceptualHashImage(imgBuf);
            const dist = hammingDistanceBits(perceptualHash, h);
            const sim = hammingSimilarity(perceptualHash, h);
            if (dist != null && dist < PHASH_HAMMING_MAX) {
              results.push({
                id: randomUUID(),
                url,
                matchType: "visual",
                confidence: sim ?? 1 - dist / perceptualHash.length,
                excerpt: `Visual similarity to asset (pHash distance ${dist}). Image: ${imgUrl.slice(0, 120)}`,
                detectedAt: now(),
                status: "pending",
              });
              break;
            }
          } catch {
            /* ignore bad image */
          }
        }
      }
    }

    const unique = dedupeByUrl(results);
    const scan_status = unique.length ? "flagged" : "safe";

    console.log("[piracyPipeline] scan complete:", {
      contentId,
      hits: unique.length,
      scan_status,
    });

    if (supabase) {
      const { error } = await supabase
        .from("content")
        .update({ detections: unique, scan_status })
        .eq("id", contentId);
      if (error) console.error("[piracyPipeline] Supabase update failed:", error);
    } else {
      for (const d of unique) {
        await db.insert(detectionTable).values({
          uuid: d.id,
          contentId,
          contentTitle: fileName,
          similarityScore: d.confidence,
          detectionType: d.matchType,
          sourceUrl: d.url,
          sourcePlatform: normalizeHost(d.url),
          status: d.status,
          excerpt: d.excerpt.slice(0, 2000),
          aiAnalysis: `Potential piracy (${d.matchType}). Confidence ${(d.confidence * 100).toFixed(1)}%.`,
          detectedAt: new Date(d.detectedAt),
          ownerId: userId,
        });
      }
    }
  } catch (e) {
    console.error("[piracyPipeline] fatal:", e);
    if (supabase) {
      const { error: resetErr } = await supabase
        .from("content")
        .update({ detections: [], scan_status: "safe" })
        .eq("id", contentId);
      if (resetErr) console.warn("[piracyPipeline] reset after error:", resetErr.message);
    }
  }
}
