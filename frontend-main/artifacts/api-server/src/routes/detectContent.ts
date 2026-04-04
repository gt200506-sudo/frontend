import { Router } from "express";
import { db, contentTable, eq } from "@workspace/db";
import { getSupabaseServer } from "../lib/supabase";
import { runWebDetection, type LibraryScanItemResult } from "../services/libraryWebDetection";

const router = Router();

function parseBody(body: unknown): { contentIds?: string[]; hashes?: string[] } {
  if (!body || typeof body !== "object") return {};
  const o = body as Record<string, unknown>;
  const ids = o.contentIds;
  const hashes = o.hashes;
  return {
    contentIds: Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : undefined,
    hashes: Array.isArray(hashes) ? hashes.filter((x): x is string => typeof x === "string") : undefined,
  };
}

type ContentRowInput = {
  id: string;
  file_name: string;
  content_hash: string | null;
  text_snippet: string | null;
  /** Supabase `full_text` or Drizzle `extracted_full_text` — preferred for detection. */
  full_text: string | null;
  file_type: string | null;
  perceptual_hash: string | null;
};

export type DetectContentMatch = {
  url: string;
  similarity: number;
  status: "low" | "medium" | "high";
  title?: string;
  snippet?: string;
};

export type DetectContentItemResponse = {
  contentId: string;
  fingerprint: string;
  matches: DetectContentMatch[];
  warnings: string[];
};

export type DetectNotification = {
  contentId: string;
  message: string;
  topUrl?: string;
  similarity: number;
  risk: "Low" | "Medium" | "High";
};

function toResponseItem(r: LibraryScanItemResult): DetectContentItemResponse {
  return {
    contentId: r.contentId,
    fingerprint: r.fingerprint,
    matches: r.matches.map((m) => ({
      url: m.url,
      similarity: m.similarity,
      status: m.status,
      title: m.title,
      snippet: m.snippet,
    })),
    warnings: r.warnings,
  };
}

function buildNotifications(items: DetectContentItemResponse[]): DetectNotification[] {
  const out: DetectNotification[] = [];
  for (const it of items) {
    const top = it.matches[0];
    if (!top || top.similarity < 45) continue;
    const risk: DetectNotification["risk"] =
      top.status === "high" ? "High" : top.status === "medium" ? "Medium" : "Low";
    out.push({
      contentId: it.contentId,
      message: `Possible match (${top.similarity}% similar)`,
      topUrl: top.url,
      similarity: top.similarity,
      risk,
    });
  }
  return out.slice(0, 8);
}

/** Cap per request to avoid HTTP timeouts; raise via DETECT_CONTENT_MAX_ITEMS (max 500). */
const MAX_BATCH = Math.min(
  500,
  Math.max(1, parseInt(process.env.DETECT_CONTENT_MAX_ITEMS ?? "100", 10) || 100),
);

router.post("/detect-content", async (req, res) => {
  const userId = (req as { userId?: string }).userId;
  if (!userId) {
    console.warn("[detect-content] 401 Unauthorized: no userId (send Authorization: Bearer or x-user-id)");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { contentIds: requestedIds, hashes: requestedHashes } = parseBody(req.body);

  try {
    const supabase = getSupabaseServer();
    let rows: ContentRowInput[] = [];

    if (supabase) {
      const { data, error } = await supabase
        .from("content")
        .select("id, file_name, content_hash, text_snippet, full_text, file_type, perceptual_hash, ipfs_hash")
        .eq("user_id", userId);

      if (error) {
        console.error("[detect-content] Supabase:", error);
        return res.status(500).json({ error: "Failed to load content", details: error.message });
      }

      const raw = (data ?? []) as Record<string, unknown>[];
      rows = raw.map((r) => ({
        id: String(r.id),
        file_name: String(r.file_name ?? ""),
        content_hash: (r.content_hash as string | null) ?? null,
        text_snippet: (r.text_snippet as string | null) ?? null,
        full_text: (r.full_text as string | null) ?? null,
        file_type: (r.file_type as string | null) ?? null,
        perceptual_hash: (r.perceptual_hash as string | null) ?? null,
      }));

      if (requestedIds?.length) {
        const set = new Set(requestedIds);
        rows = rows.filter((r) => set.has(r.id));
      } else if (requestedHashes?.length) {
        const set = new Set(requestedHashes.map((h) => h.toLowerCase()));
        rows = rows.filter((r) => {
          const h = (r.content_hash ?? "").toLowerCase();
          return set.has(h);
        });
      }
    } else {
      const all = await db.select().from(contentTable).where(eq(contentTable.ownerId, userId));
      rows = all.map((c) => ({
        id: String(c.uuid),
        file_name: String(c.title ?? ""),
        content_hash: c.contentHash != null ? String(c.contentHash) : null,
        text_snippet: (c.description as string | null) ?? null,
        full_text: c.extractedFullText != null ? String(c.extractedFullText) : null,
        file_type:
          c.type === "image"
            ? "image/jpeg"
            : c.type === "video"
              ? "video/mp4"
              : "application/octet-stream",
        perceptual_hash: c.perceptualHash != null ? String(c.perceptualHash) : null,
      }));
      if (requestedIds?.length) {
        const set = new Set(requestedIds);
        rows = rows.filter((r) => set.has(r.id));
      } else if (requestedHashes?.length) {
        const set = new Set(requestedHashes.map((h) => h.toLowerCase()));
        rows = rows.filter((r) => set.has((r.content_hash ?? "").toLowerCase()));
      }
    }

    const totalEligible = rows.length;
    const truncated = totalEligible > MAX_BATCH;
    rows = rows.slice(0, MAX_BATCH);

    console.log("🚀 NEW DETECTION PIPELINE RUNNING");
    console.log("[detect-content] batch", { batchSize: rows.length, truncated });

    const scanResults = await runWebDetection(rows);

    const items: DetectContentItemResponse[] = [];

    for (let i = 0; i < scanResults.length; i++) {
      const scan = scanResults[i]!;
      const row = rows[i]!;
      const respItem = toResponseItem(scan);
      items.push(respItem);

      if (supabase) {
        const payload = {
          scannedAt: new Date().toISOString(),
          fingerprint: scan.fingerprint,
          matches: respItem.matches,
          queriesUsed: scan.queriesUsed,
          warnings: scan.warnings,
        };
        const { error: upErr } = await supabase
          .from("content")
          .update({ library_matches: payload as unknown as Record<string, unknown> })
          .eq("id", row.id)
          .eq("user_id", userId);
        if (upErr) console.warn("[detect-content] persist library_matches failed:", upErr.message);
      }
    }

    const notifications = buildNotifications(items);

    return res.json({
      processedAt: new Date().toISOString(),
      count: items.length,
      totalEligible,
      maxBatch: MAX_BATCH,
      truncated,
      items,
      notifications,
    });
  } catch (e) {
    console.error("[detect-content]", e);
    return res.status(500).json({ error: "Detection run failed", message: (e as Error)?.message });
  }
});

export default router;
