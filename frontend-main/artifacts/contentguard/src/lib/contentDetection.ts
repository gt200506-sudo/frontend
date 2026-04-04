import { customFetch } from "@workspace/api-client-react";
import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/authStorage";

export type DetectContentMatch = {
  url: string;
  similarity: number;
  status: "low" | "medium" | "high";
  title?: string;
  snippet?: string;
};

export type DetectContentNotification = {
  contentId: string;
  message: string;
  topUrl?: string;
  similarity: number;
  risk: "Low" | "Medium" | "High";
};

/** Normalized row used by Content Library (scan result + UI status). */
export type DetectContentResultItem = {
  contentId: string;
  fingerprint: string;
  matches: DetectContentMatch[];
  status: "matched" | "not_matched" | "potential";
  scannedAt?: string;
  warnings?: string[];
};

export type DetectContentResponse = {
  processedAt: string;
  count: number;
  totalEligible?: number;
  maxBatch?: number;
  truncated?: boolean;
  items: Array<{
    contentId: string;
    fingerprint: string;
    matches: DetectContentMatch[];
    warnings: string[];
  }>;
  notifications: DetectContentNotification[];
};

function overallStatus(matches: DetectContentMatch[]): DetectContentResultItem["status"] {
  if (!matches.length) return "not_matched";
  const top = matches.reduce((a, b) => (a.similarity >= b.similarity ? a : b));
  if (top.status === "high" || top.similarity >= 75) return "matched";
  if (top.status === "medium" || top.similarity >= 45) return "potential";
  return "not_matched";
}

/** Build a result item from persisted `libraryMatches` (GET /api/content) or a scan item. */
export function detectResultFromPayload(
  contentId: string,
  payload: Record<string, unknown> | undefined,
): DetectContentResultItem | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const matchesRaw = Array.isArray(payload.matches) ? payload.matches : [];
  const scannedAt = typeof payload.scannedAt === "string" ? payload.scannedAt : undefined;
  const fingerprint = typeof payload.fingerprint === "string" ? payload.fingerprint : "";

  const matches: DetectContentMatch[] = [];
  for (const m of matchesRaw) {
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url : "";
    const similarity = typeof o.similarity === "number" ? o.similarity : Number(o.similarity) || 0;
    const st = o.status;
    const status: DetectContentMatch["status"] =
      st === "high" || st === "medium" || st === "low" ? st : "low";
    if (!url) continue;
    const row: DetectContentMatch = { url, similarity, status };
    if (typeof o.title === "string") row.title = o.title;
    if (typeof o.snippet === "string") row.snippet = o.snippet;
    matches.push(row);
  }

  if (!scannedAt && matches.length === 0 && !fingerprint) return undefined;

  const warningsRaw = payload.warnings;
  const warnings = Array.isArray(warningsRaw)
    ? warningsRaw.filter((w): w is string => typeof w === "string")
    : undefined;

  return {
    contentId,
    fingerprint,
    matches,
    status: overallStatus(matches),
    scannedAt,
    warnings,
  };
}

/**
 * Batch web detection via SerpAPI. Scoped by optional `contentIds` / `hashes`; omit both to scan all library items (server may cap batch size).
 */
export async function startAIDetection(params?: {
  contentIds?: string[];
  hashes?: string[];
}): Promise<DetectContentResponse> {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  console.log("[detect-content] Sending POST /api/detect-content", {
    hasToken: Boolean(token),
    body: params ?? {},
  });

  return customFetch<DetectContentResponse>("/api/detect-content", {
    method: "POST",
    body: JSON.stringify(params ?? {}),
    responseType: "json",
  });
}

export function itemsToResultMap(
  items: DetectContentResponse["items"],
  scannedAt?: string,
): Record<string, DetectContentResultItem> {
  const out: Record<string, DetectContentResultItem> = {};
  for (const it of items) {
    out[it.contentId] = {
      contentId: it.contentId,
      fingerprint: it.fingerprint,
      matches: it.matches,
      status: overallStatus(it.matches),
      warnings: it.warnings,
      scannedAt,
    };
  }
  return out;
}
