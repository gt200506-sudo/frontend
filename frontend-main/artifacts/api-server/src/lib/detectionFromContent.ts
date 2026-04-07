import { normalizeHost, type PipelineDetection } from "../services/piracyPipeline";

function toIsoDate(value: unknown): string {
  if (typeof value === "string" && value) return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

function toConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  // Support either fractional [0..1] or percent [0..100].
  return n > 1 ? n / 100 : n;
}

function mapMatchStatusToType(status: unknown): PipelineDetection["matchType"] {
  if (status === "high") return "exact";
  if (status === "medium") return "partial";
  return "paraphrase";
}

function stableId(contentId: string, index: number, url: string): string {
  const compact = Buffer.from(url).toString("base64").replace(/=+$/g, "").slice(0, 12);
  return `${contentId}-lib-${index}-${compact}`;
}

export function extractDetectionsFromContentRow(
  contentId: string,
  contentTitle: string,
  row: Record<string, unknown>,
): PipelineDetection[] {
  // Source 1: piracy pipeline format in `detections` column.
  const direct = row.detections;
  if (Array.isArray(direct)) {
    const out: PipelineDetection[] = [];
    for (const x of direct) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const url = typeof o.url === "string" ? o.url : "";
      if (!url) continue;
      const matchType = o.matchType ?? o.match_type;
      const normalizedType: PipelineDetection["matchType"] =
        matchType === "exact" || matchType === "visual" || matchType === "partial" || matchType === "paraphrase"
          ? matchType
          : "partial";

      const status = o.status;
      const normalizedStatus: PipelineDetection["status"] =
        status === "confirmed" || status === "dismissed" ? status : "pending";

      out.push({
        id: typeof o.id === "string" ? o.id : stableId(contentId, out.length, url),
        url,
        matchType: normalizedType,
        confidence: toConfidence(o.confidence),
        excerpt: typeof o.excerpt === "string" ? o.excerpt : `Detection for ${contentTitle}`,
        detectedAt: toIsoDate(o.detectedAt ?? o.detected_at),
        status: normalizedStatus,
      });
    }
    if (out.length > 0) return out;
  }

  // Source 2: web-scan payload in `library_matches` / `libraryMatches`.
  const libraryPayload = (row.library_matches ?? row.libraryMatches) as Record<string, unknown> | undefined;
  if (libraryPayload && typeof libraryPayload === "object") {
    const matches = Array.isArray(libraryPayload.matches) ? libraryPayload.matches : [];
    const scannedAt = toIsoDate(libraryPayload.scannedAt);
    return matches
      .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === "object"))
      .map((m, index) => {
        const url = typeof m.url === "string" ? m.url : "";
        const reviewStatus = (m.reviewStatus as string | undefined) ?? "pending";
        return {
          id: stableId(contentId, index, url),
          url,
          matchType: mapMatchStatusToType(m.status),
          confidence: toConfidence(m.similarity),
          excerpt: typeof m.snippet === "string" ? m.snippet : `Detection for ${contentTitle}`,
          detectedAt: scannedAt,
          status:
            reviewStatus === "confirmed" || reviewStatus === "dismissed"
              ? (reviewStatus as "confirmed" | "dismissed")
              : ("pending" as const),
        };
      })
      .filter((d) => d.url);
  }

  return [];
}

export function toDetectionApiItem(
  contentId: string,
  contentTitle: string,
  detection: PipelineDetection,
) {
  return {
    id: detection.id,
    contentId,
    contentTitle,
    similarityScore: detection.confidence,
    detectionType: detection.matchType,
    sourceUrl: detection.url,
    sourcePlatform: normalizeHost(detection.url),
    detectedAt: detection.detectedAt,
    status: detection.status,
    excerpt: detection.excerpt,
    aiAnalysis: `Potential piracy (${detection.matchType}). Confidence ${(detection.confidence * 100).toFixed(1)}%.`,
  };
}

