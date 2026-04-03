import { Router } from "express";
import { db, detectionTable, eq, desc } from "@workspace/db";
import {
  ListDetectionsQueryParams,
  GetDetectionParams,
  UpdateDetectionStatusParams,
  UpdateDetectionStatusBody,
} from "@workspace/api-zod";
import { getSupabaseServer } from "../lib/supabase";
import { normalizeHost, type PipelineDetection } from "../services/piracyPipeline";

const router = Router();

function parseStoredDetections(raw: unknown): PipelineDetection[] {
  if (!Array.isArray(raw)) return [];
  const out: PipelineDetection[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const id = o.id;
    const url = o.url;
    if (typeof id !== "string" || typeof url !== "string") continue;
    const matchType = (o.matchType ?? o.match_type) as PipelineDetection["matchType"];
    const confidence = typeof o.confidence === "number" ? o.confidence : Number(o.confidence);
    const excerpt = typeof o.excerpt === "string" ? o.excerpt : "";
    const detectedAt = typeof o.detectedAt === "string" ? o.detectedAt : String(o.detectedAt ?? "");
    const status = (o.status as PipelineDetection["status"]) || "pending";
    if (!["exact", "visual", "partial", "paraphrase"].includes(matchType)) continue;
    if (!Number.isFinite(confidence)) continue;
    out.push({
      id,
      url,
      matchType,
      confidence,
      excerpt,
      detectedAt,
      status: status === "confirmed" || status === "dismissed" ? status : "pending",
    });
  }
  return out;
}

function toApiItem(row: { id: string; file_name: string }, d: PipelineDetection) {
  return {
    id: d.id,
    contentId: row.id,
    contentTitle: row.file_name,
    similarityScore: d.confidence,
    detectionType: d.matchType,
    sourceUrl: d.url,
    sourcePlatform: normalizeHost(d.url),
    detectedAt: d.detectedAt,
    status: d.status,
    excerpt: d.excerpt,
    aiAnalysis: `Potential piracy (${d.matchType}). Confidence ${(d.confidence * 100).toFixed(1)}%.`,
  };
}

router.get("/detections", async (req, res) => {
  const query = ListDetectionsQueryParams.parse(req.query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;
  const userId = (req as any).userId;

  const supabase = getSupabaseServer();
  if (supabase) {
    const { data, error } = await supabase
      .from("content")
      .select("id, file_name, detections")
      .eq("user_id", userId);
    console.log("Fetched content:", data);
    if (error) {
      console.error("Supabase list detections:", error);
      return res.status(500).json({ error: "Failed to load detections", details: error.message });
    }

    const flat: ReturnType<typeof toApiItem>[] = [];
    for (const row of data ?? []) {
      const fileName = (row as any).file_name as string;
      const dets = parseStoredDetections((row as any).detections);
      for (const d of dets) {
        flat.push(toApiItem({ id: (row as any).id, file_name: fileName }, d));
      }
    }

    let filtered = flat;
    if (query.contentId) filtered = filtered.filter((d) => d.contentId === query.contentId);
    if (query.status) filtered = filtered.filter((d) => d.status === query.status);
    if (query.minSimilarity != null) filtered = filtered.filter((d) => d.similarityScore >= query.minSimilarity!);

    filtered.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

    const items = filtered.slice(offset, offset + limit);
    return res.json({ items, total: filtered.length, page, limit });
  }

  const allItems = await db.select().from(detectionTable).where(eq(detectionTable.ownerId, userId)).orderBy(desc(detectionTable.detectedAt));

  let filtered = allItems;
  if (query.contentId) filtered = filtered.filter((d) => d.contentId === query.contentId);
  if (query.status) filtered = filtered.filter((d) => d.status === query.status);
  if (query.minSimilarity != null) filtered = filtered.filter((d) => (d.similarityScore as number) >= query.minSimilarity!);

  const items = filtered.slice(offset, offset + limit).map((d) => ({
    id: d.uuid,
    contentId: d.contentId,
    contentTitle: d.contentTitle,
    similarityScore: d.similarityScore,
    detectionType: d.detectionType,
    sourceUrl: d.sourceUrl,
    sourcePlatform: d.sourcePlatform,
    detectedAt: d.detectedAt instanceof Date ? d.detectedAt.toISOString() : new Date(d.detectedAt as any).toISOString(),
    status: d.status,
    excerpt: d.excerpt,
    aiAnalysis: d.aiAnalysis ?? null,
  }));

  return res.json({ items, total: filtered.length, page, limit });
});

router.get("/detections/:id", async (req, res) => {
  const userId = (req as any).userId;
  const { id } = GetDetectionParams.parse(req.params);

  const supabase = getSupabaseServer();
  if (supabase) {
    const { data, error } = await supabase.from("content").select("id, file_name, detections").eq("user_id", userId);
    if (error) {
      console.error("Supabase get detection:", error);
      return res.status(500).json({ error: "Failed to load detection", details: error.message });
    }
    for (const row of data ?? []) {
      const dets = parseStoredDetections((row as any).detections);
      const found = dets.find((d) => d.id === id);
      if (found) {
        return res.json(toApiItem({ id: (row as any).id, file_name: (row as any).file_name }, found));
      }
    }
    return res.status(404).json({ error: "Not found" });
  }

  const [item] = await db.select().from(detectionTable).where(eq(detectionTable.uuid, id));
  if (!item || item.ownerId !== userId) return res.status(404).json({ error: "Not found" });

  return res.json({
    id: item.uuid,
    contentId: item.contentId,
    contentTitle: item.contentTitle,
    similarityScore: item.similarityScore,
    detectionType: item.detectionType,
    sourceUrl: item.sourceUrl,
    sourcePlatform: item.sourcePlatform,
    detectedAt: item.detectedAt instanceof Date ? item.detectedAt.toISOString() : new Date(item.detectedAt as any).toISOString(),
    status: item.status,
    excerpt: item.excerpt,
    aiAnalysis: item.aiAnalysis ?? null,
  });
});

router.patch("/detections/:id", async (req, res) => {
  const userId = (req as any).userId;
  const { id } = UpdateDetectionStatusParams.parse(req.params);
  const body = UpdateDetectionStatusBody.parse(req.body);

  const supabase = getSupabaseServer();
  if (supabase) {
    const { data: rows, error } = await supabase.from("content").select("id, file_name, detections").eq("user_id", userId);
    if (error) {
      console.error("Supabase patch detection:", error);
      return res.status(500).json({ error: "Failed to update detection", details: error.message });
    }
    for (const row of rows ?? []) {
      const dets = parseStoredDetections((row as any).detections);
      const idx = dets.findIndex((d) => d.id === id);
      if (idx < 0) continue;
      const next = [...dets];
      next[idx] = { ...next[idx], status: body.status };
      const { error: upErr } = await supabase.from("content").update({ detections: next }).eq("id", (row as any).id);
      if (upErr) {
        console.error("Supabase patch detection update:", upErr);
        return res.status(500).json({ error: "Failed to update detection", details: upErr.message });
      }
      return res.json(toApiItem({ id: (row as any).id, file_name: (row as any).file_name }, next[idx]));
    }
    return res.status(404).json({ error: "Not found" });
  }

  const [updated] = await db
    .update(detectionTable)
    .set({ status: body.status })
    .where(eq(detectionTable.uuid, id))
    .where(eq(detectionTable.ownerId, userId))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });

  return res.json({
    id: updated.uuid,
    contentId: updated.contentId,
    contentTitle: updated.contentTitle,
    similarityScore: updated.similarityScore,
    detectionType: updated.detectionType,
    sourceUrl: updated.sourceUrl,
    sourcePlatform: updated.sourcePlatform,
    detectedAt: updated.detectedAt instanceof Date ? updated.detectedAt.toISOString() : new Date(updated.detectedAt as any).toISOString(),
    status: updated.status,
    excerpt: updated.excerpt,
    aiAnalysis: updated.aiAnalysis ?? null,
  });
});

export default router;
