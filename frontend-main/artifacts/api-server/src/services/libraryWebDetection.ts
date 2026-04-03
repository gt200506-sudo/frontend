/**
 * Content Library web detection: SerpAPI search + text similarity (+ optional image pHash).
 * Replace similarity helpers with embeddings later without changing the route contract.
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

const SCRAPE_DELAY_MS = 450;
const MAX_QUERIES_PER_ASSET = 2;
const MAX_ORGANIC = 6;
const MAX_SCRAPE = 4;
const TEXT_THRESHOLD = 0.35;

function riskFromSimilarity(pct: number): MatchRiskLevel {
  if (pct >= 75) return "high";
  if (pct >= 50) return "medium";
  return "low";
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 12_000);
}

/** Build 1–2 search queries from filename + optional text snippet + hash. */
export function buildSearchQueries(fileName: string, textSnippet: string | null, contentHash: string): string[] {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  const words = base.split(/\s+/).filter((w) => w.length > 2).slice(0, 5);
  const keywordQ = words.length ? `"${words.slice(0, 3).join(" ")}"` : `"${fileName.slice(0, 40)}"`;
  const queries: string[] = [];
  const sn = (textSnippet ?? "").replace(/\s+/g, " ").trim();
  if (sn.length > 24) {
    queries.push(`${keywordQ} ${sn.slice(0, 100)}`);
  } else {
    queries.push(keywordQ);
  }
  if (contentHash.length >= 16) {
    queries.push(`${keywordQ} ${contentHash.slice(0, 16)}`);
  }
  return [...new Set(queries)].slice(0, MAX_QUERIES_PER_ASSET);
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
 * Run SerpAPI + similarity for one content row (metadata from DB).
 */
export async function scanSingleLibraryItem(row: {
  id: string;
  file_name: string;
  content_hash: string | null;
  text_snippet: string | null;
  file_type: string | null;
  perceptual_hash: string | null;
}): Promise<LibraryScanItemResult> {
  const contentId = String(row.id);
  const fileName = String(row.file_name ?? "untitled");
  const contentHash = String(row.content_hash ?? "");
  const textSnippet = row.text_snippet;
  const perceptualHash = row.perceptual_hash;
  const fileType = String(row.file_type ?? "");
  const isImageAsset = fileType.startsWith("image/");

  const fingerprint = fingerprintForRow(contentId, fileName, contentHash, textSnippet, perceptualHash);
  const warnings: string[] = [];
  const queriesUsed = buildSearchQueries(fileName, textSnippet, contentHash);

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

  const assetText = normalizeText(
    `${fileName}\n${textSnippet ?? ""}\n${contentHash.slice(0, 32)}`,
  );

  const seenUrls = new Set<string>();
  const organicAccum: { link: string; title: string; snippet: string }[] = [];

  for (const q of queriesUsed) {
    const g = await serpApiOrganicResults(q, "google");
    for (const o of g) {
      if (!seenUrls.has(o.link)) {
        seenUrls.add(o.link);
        organicAccum.push(o);
      }
    }
    await delayBetweenSearches();
    if (organicAccum.length < 4) {
      const b = await serpApiOrganicResults(q, "bing");
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

  for (let i = 0; i < topOrganic.length; i++) {
    const o = topOrganic[i];
    const serpBlob = normalizeText(`${o.title} ${o.snippet}`);
    let textSim = compareTwoStrings(assetText.slice(0, 8_000), serpBlob);
    if (textSim < TEXT_THRESHOLD && i < 4) {
      await delayBetweenSearches(SCRAPE_DELAY_MS);
      const page = await scrapePage(o.link);
      if (page?.text) {
        const pg = normalizeText(page.text.slice(0, 8_000));
        textSim = Math.max(textSim, compareTwoStrings(assetText.slice(0, 8_000), pg));
        const visBoost = await maybeVisualBoost(perceptualHash, isImageAsset, page.imageUrls);
        if (visBoost > 0) {
          textSim = Math.min(1, textSim + visBoost / 100);
        }
      }
    }

    const pct = Math.round(Math.min(100, textSim * 100));
    if (pct < 30) continue;

    matches.push({
      url: o.link,
      similarity: pct,
      status: riskFromSimilarity(pct),
      title: o.title,
      snippet: o.snippet,
    });
  }

  matches.sort((a, b) => b.similarity - a.similarity);

  return {
    contentId,
    fingerprint,
    matches: matches.slice(0, 12),
    queriesUsed,
    warnings,
  };
}
