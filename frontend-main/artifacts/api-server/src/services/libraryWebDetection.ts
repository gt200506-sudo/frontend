/**
 * Content Library web detection: SerpAPI search + chunk/substring similarity on scraped pages.
 */

import { createHash } from "node:crypto";
import { compareTwoStrings } from "string-similarity";
import {
  serpApiOrganicResults,
  scrapePage,
  delayBetweenSearches,
} from "./webScanner";
import { hammingSimilarity, perceptualHashImage } from "../lib/piracyDetection";
import axios from "axios";

export type MatchRiskLevel = "low" | "medium" | "high";

export type LibraryMatch = {
  url: string;
  similarity: number;
  status: MatchRiskLevel;
  title?: string;
  snippet?: string;
};

export type LibraryScanItemResult = {
  contentId: string;
  fingerprint: string;
  matches: LibraryMatch[];
  queriesUsed: string[];
  warnings: string[];
};

/** Row shape from Supabase/Drizzle before web detection. */
export type LibraryContentRow = {
  id: string;
  file_name: string;
  content_hash: string | null;
  text_snippet: string | null;
  /** Long extracted body (Supabase `full_text` / Drizzle `extracted_full_text`). */
  full_text?: string | null;
  file_type: string | null;
  perceptual_hash: string | null;
};

const MAX_ASSET_TEXT_FOR_DETECTION = 80_000;

/**
 * Run SerpAPI + chunk/scrape similarity for each library row (batch entry point for /api/detect-content).
 */
export async function runWebDetection(rows: LibraryContentRow[]): Promise<LibraryScanItemResult[]> {
  const results: LibraryScanItemResult[] = [];
  for (const row of rows) {
    results.push(await scanSingleLibraryItem(row));
  }
  return results;
}

const SCRAPE_DELAY_MS = 450;
const MAX_QUERIES_PER_ASSET = 3;
const MAX_ORGANIC = 10;
const MAX_SCRAPE_PER_ASSET = 8;
const MIN_CHUNK_LEN = 36;
const MAX_CHUNKS = 6;

/** Dice on whole strings often misses a short copied paragraph inside a long page — use chunks + windows. */
const REPORT_MIN_PCT = 28;

function riskFromSimilarity(pct: number): MatchRiskLevel {
  if (pct >= 75) return "high";
  if (pct >= 50) return "medium";
  return "low";
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 12_000);
}

/** Lowercase, strip punctuation noise for substring checks. */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract 1–2 sentence–scale chunks from stored snippet (upload pipeline should persist real text).
 */
export function extractContentChunks(textSnippet: string | null, fileName: string): string[] {
  const raw = (textSnippet ?? "").replace(/\s+/g, " ").trim();
  const chunks: string[] = [];

  const sentences = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  for (const s of sentences) {
    if (s.length >= MIN_CHUNK_LEN) chunks.push(s.slice(0, 320));
  }

  if (chunks.length < 2 && raw.length >= MIN_CHUNK_LEN) {
    chunks.unshift(raw.slice(0, 240));
  }

  if (chunks.length < 3 && raw.length > MIN_CHUNK_LEN) {
    for (let i = 0; i < raw.length && chunks.length < MAX_CHUNKS; i += 100) {
      const w = raw.slice(i, i + 140).trim();
      if (w.length >= MIN_CHUNK_LEN) chunks.push(w);
    }
  }

  const titleBase = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  if (titleBase.length > 14 && chunks.length < MAX_CHUNKS) {
    chunks.push(titleBase.slice(0, 120));
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of chunks) {
    const t = c.trim();
    if (t.length < MIN_CHUNK_LEN) continue;
    const key = t.slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  if (out.length === 0 && raw.length >= 20) {
    out.push(raw.slice(0, Math.min(400, raw.length)));
  }
  return out.slice(0, MAX_CHUNKS);
}

/** Build SerpAPI queries from filename + meaningful chunks (quoted phrases help exact-match sources). */
export function buildSearchQueries(fileName: string, textSnippet: string | null, contentHash: string): string[] {
  const chunks = extractContentChunks(textSnippet, fileName);
  const queries: string[] = [];
  const stem = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();

  if (chunks[0]) {
    const q = chunks[0].slice(0, 110);
    queries.push(q.includes(" ") ? `"${q}"` : q);
  }
  if (chunks[1]) {
    queries.push(`${stem.slice(0, 48)} ${chunks[1].slice(0, 90)}`);
  }
  if (chunks[2] && queries.length < MAX_QUERIES_PER_ASSET) {
    queries.push(chunks[2].slice(0, 100));
  }
  if (queries.length === 0 && stem.length > 3) {
    queries.push(`"${stem.slice(0, 80)}"`);
  }
  if (contentHash.length >= 16 && queries.length < MAX_QUERIES_PER_ASSET) {
    queries.push(`${stem} ${contentHash.slice(0, 16)}`);
  }

  return [...new Set(queries.filter(Boolean))].slice(0, MAX_QUERIES_PER_ASSET);
}

function fingerprintForRow(
  contentId: string,
  fileName: string,
  contentHash: string,
  textSnippet: string | null,
  perceptualHash: string | null,
): string {
  return createHash("sha256")
    .update([contentId, fileName, contentHash, textSnippet ?? "", perceptualHash ?? ""].join("|"))
    .digest("hex");
}

/** Max Dice similarity of chunk against sliding windows of the page (handles long articles). */
function bestDiceChunkAgainstPage(chunkNorm: string, pageNorm: string): number {
  const c = chunkNorm.slice(0, 240);
  if (!c.length) return 0;
  if (pageNorm.length <= c.length) return compareTwoStrings(c, pageNorm);

  let best = 0;
  const winLen = Math.min(Math.max(c.length * 2, 180), 700);
  const limit = Math.min(pageNorm.length, 22_000);
  for (let i = 0; i + winLen <= limit; i += 95) {
    const win = pageNorm.slice(i, i + winLen);
    best = Math.max(best, compareTwoStrings(c, win));
  }
  return best;
}

/**
 * Score uploaded chunks vs Serp snippet + full page text: substring wins, else Dice on windows.
 */
function scoreChunksAgainstResult(args: {
  chunks: string[];
  serpTitle: string;
  serpSnippet: string;
  pageText: string | null;
}): { pct: number; preview?: string } {
  const { chunks, serpTitle, serpSnippet, pageText } = args;
  const serpNorm = normalizeForMatch(`${serpTitle} ${serpSnippet}`);
  const pageNorm = pageText ? normalizeForMatch(pageText) : "";

  let bestPct = 0;
  let preview: string | undefined;

  for (const chunk of chunks) {
    const cRaw = chunk.trim();
    const c = normalizeForMatch(cRaw);
    if (c.length < 24) continue;

    // Strong: long substring appears on page (typical copy-paste / Wikipedia)
    if (pageNorm.length >= c.length && pageNorm.includes(c)) {
      return { pct: 96, preview: cRaw.slice(0, 200) };
    }
    const prefix = c.slice(0, Math.min(72, c.length));
    if (prefix.length >= 32 && pageNorm.includes(prefix)) {
      bestPct = Math.max(bestPct, 90);
      preview = preview ?? cRaw.slice(0, 200);
    }

    if (pageNorm.length) {
      const dicePage = bestDiceChunkAgainstPage(c, pageNorm);
      bestPct = Math.max(bestPct, Math.round(dicePage * 100));
      if (dicePage >= 0.35) preview = preview ?? cRaw.slice(0, 160);
    }

    const diceSerp = compareTwoStrings(c.slice(0, 200), serpNorm);
    bestPct = Math.max(bestPct, Math.round(diceSerp * 100));
  }

  return { pct: Math.min(100, bestPct), preview };
}

async function maybeVisualBoost(
  perceptualHash: string | null,
  isImageAsset: boolean,
  pageImageUrls: string[],
): Promise<number> {
  if (!perceptualHash || !isImageAsset || pageImageUrls.length === 0) return 0;
  let best = 0;
  for (const imgUrl of pageImageUrls.slice(0, 2)) {
    try {
      const { data, status } = await axios.get<ArrayBuffer>(imgUrl, {
        responseType: "arraybuffer",
        timeout: 8_000,
        maxContentLength: 2_000_000,
        validateStatus: (s) => s === 200,
      });
      if (status !== 200) continue;
      const buf = Buffer.from(data);
      const h = await perceptualHashImage(buf);
      const sim = hammingSimilarity(perceptualHash, h) ?? 0;
      best = Math.max(best, sim);
    } catch {
      /* skip */
    }
  }
  return Math.round(best * 30);
}

/**
 * Run SerpAPI + chunk matching for one content row (metadata from DB).
 */
export async function scanSingleLibraryItem(row: LibraryContentRow): Promise<LibraryScanItemResult> {
  const contentId = String(row.id);
  const fileName = String(row.file_name ?? "untitled");
  const contentHash = String(row.content_hash ?? "");
  const textSnippet = row.text_snippet;
  const fullText = row.full_text ?? null;
  const assetText = normalizeText((fullText || textSnippet) ?? "").slice(0, MAX_ASSET_TEXT_FOR_DETECTION);
  const perceptualHash = row.perceptual_hash;
  const fileType = String(row.file_type ?? "");
  const isImageAsset = fileType.startsWith("image/");

  const fingerprint = fingerprintForRow(
    contentId,
    fileName,
    contentHash,
    assetText || textSnippet,
    perceptualHash,
  );
  const warnings: string[] = [];
  const chunks = extractContentChunks(assetText || null, fileName);
  const queriesUsed = buildSearchQueries(fileName, assetText || null, contentHash);

  console.log(`[libraryWebDetection] contentId=${contentId} chunks=${chunks.length} queries=${JSON.stringify(queriesUsed)}`);

  if (!process.env.SERPAPI_KEY) {
    warnings.push("SERPAPI_KEY not set — configure SerpAPI for live web search.");
    return {
      contentId,
      fingerprint,
      matches: [],
      queriesUsed,
      warnings,
    };
  }

  if (chunks.length === 0 && !assetText.trim()) {
    warnings.push(
      "No extractable text stored for this asset — upload PDF, TXT, DOCX, or add optional OCR. Matches rely on filename/hash only.",
    );
  }

  const seenUrls = new Set<string>();
  const organicAccum: { link: string; title: string; snippet: string }[] = [];

  for (const q of queriesUsed) {
    console.log(`[libraryWebDetection] SerpAPI google q=${q.slice(0, 120)}${q.length > 120 ? "…" : ""}`);
    const g = await serpApiOrganicResults(q, "google");
    console.log(`[libraryWebDetection] google organic_results: ${g.length} URLs`);
    for (const o of g) {
      if (!seenUrls.has(o.link)) {
        seenUrls.add(o.link);
        organicAccum.push(o);
      }
    }
    await delayBetweenSearches();
    if (organicAccum.length < 4) {
      const b = await serpApiOrganicResults(q, "bing");
      console.log(`[libraryWebDetection] bing organic_results: ${b.length} URLs`);
      for (const o of b) {
        if (!seenUrls.has(o.link)) {
          seenUrls.add(o.link);
          organicAccum.push(o);
        }
      }
      await delayBetweenSearches();
    }
    if (organicAccum.length >= MAX_ORGANIC) break;
  }

  const topOrganic = organicAccum.slice(0, MAX_ORGANIC);
  const matches: LibraryMatch[] = [];

  for (let i = 0; i < Math.min(topOrganic.length, MAX_SCRAPE_PER_ASSET); i++) {
    const o = topOrganic[i];
    await delayBetweenSearches(i === 0 ? 120 : SCRAPE_DELAY_MS);

    let pageText: string | null = null;
    let imageUrls: string[] = [];
    try {
      const page = await scrapePage(o.link);
      if (page?.text) {
        pageText = page.text;
        imageUrls = page.imageUrls ?? [];
      }
    } catch (e) {
      console.warn(`[libraryWebDetection] scrape error ${o.link}`, e);
    }

    const { pct: chunkPct, preview } = scoreChunksAgainstResult({
      chunks: chunks.length ? chunks : [normalizeText(`${fileName}\n${assetText}`).slice(0, 400)],
      serpTitle: o.title,
      serpSnippet: o.snippet,
      pageText,
    });

    let pct = chunkPct;
    if (pageText && isImageAsset) {
      const visBoost = await maybeVisualBoost(perceptualHash, isImageAsset, imageUrls);
      if (visBoost > 0) {
        pct = Math.min(100, pct + visBoost);
      }
    }

    console.log(
      `[libraryWebDetection] url=${o.link} scraped=${Boolean(pageText)} similarity=${pct}%` +
        (preview ? ` preview="${preview.slice(0, 80)}…"` : ""),
    );

    if (pct < REPORT_MIN_PCT) continue;

    matches.push({
      url: o.link,
      similarity: pct,
      status: riskFromSimilarity(pct),
      title: o.title,
      snippet: preview ?? o.snippet,
    });
  }

  matches.sort((a, b) => b.similarity - a.similarity);

  console.log(`[libraryWebDetection] contentId=${contentId} matches=${matches.length} (from ${topOrganic.length} organic URLs)`);

  return {
    contentId,
    fingerprint,
    matches: matches.slice(0, 12),
    queriesUsed,
    warnings,
  };
}
