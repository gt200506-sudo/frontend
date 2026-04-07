import { Router } from "express";
import { db, contentTable, detectionTable, eq, desc } from "@workspace/db";
import {
  ListDetectionsQueryParams,
  GetDetectionParams,
  UpdateDetectionStatusParams,
  UpdateDetectionStatusBody,
} from "@workspace/api-zod";
import { getSupabaseServer } from "../lib/supabase";
import { extractDetectionsFromContentRow, toDetectionApiItem } from "../lib/detectionFromContent";

const router = Router();

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
      .select("id, file_name, detections, library_matches")
      .eq("user_id", userId);
    console.log("[detections] source=supabase rows:", data?.length ?? 0);
    if (error) {
      console.error("Supabase list detections:", error);
      return res.status(500).json({ error: "Failed to load detections", details: error.message });
    }

    const flat: ReturnType<typeof toDetectionApiItem>[] = [];
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      const contentId = String(r.id);
      const fileName = String(r.file_name ?? "Untitled");
      const dets = extractDetectionsFromContentRow(contentId, fileName, r);
      for (const d of dets) {
        flat.push(toDetectionApiItem(contentId, fileName, d));
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

  const contentRows = await db
    .select()
    .from(contentTable)
    .where(eq(contentTable.ownerId, userId))
    .orderBy(desc(contentTable.registeredAt));

  const generatedFromContent = (contentRows as any[]).flatMap((row) => {
    const contentId = String(row.uuid);
    const contentTitle = String(row.title ?? "Untitled");
    const detections = extractDetectionsFromContentRow(contentId, contentTitle, row as Record<string, unknown>);
    return detections.map((d) => toDetectionApiItem(contentId, contentTitle, d));
  });

  const allItems = await db
    .select()
    .from(detectionTable)
    .where(eq(detectionTable.ownerId, userId))
    .orderBy(desc(detectionTable.detectedAt));

  let merged = [
    ...generatedFromContent,
    ...allItems.map((d) => ({
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
    })),
  ];

  const dedupe = new Map<string, (typeof merged)[number]>();
  for (const item of merged) {
    dedupe.set(`${item.contentId}|${item.sourceUrl}|${item.detectedAt}`, item);
  }
  merged = Array.from(dedupe.values());

  let filtered = merged;
  if (query.contentId) filtered = filtered.filter((d) => d.contentId === query.contentId);
  if (query.status) filtered = filtered.filter((d) => d.status === query.status);
  if (query.minSimilarity != null) filtered = filtered.filter((d) => (d.similarityScore as number) >= query.minSimilarity!);
  filtered.sort((a, b) => new Date(String(b.detectedAt)).getTime() - new Date(String(a.detectedAt)).getTime());

  const items = filtered.slice(offset, offset + limit);

  return res.json({ items, total: filtered.length, page, limit });
});

router.get("/detections/:id", async (req, res) => {
  const userId = (req as any).userId;
  const { id } = GetDetectionParams.parse(req.params);

  const supabase = getSupabaseServer();
  if (supabase) {
    const { data, error } = await supabase
      .from("content")
      .select("id, file_name, detections, library_matches")
      .eq("user_id", userId);
    if (error) {
      console.error("Supabase get detection:", error);
      return res.status(500).json({ error: "Failed to load detection", details: error.message });
    }
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      const dets = extractDetectionsFromContentRow(String(r.id), String(r.file_name ?? "Untitled"), r);
      const found = dets.find((d) => d.id === id);
      if (found) {
        return res.json(toDetectionApiItem(String(r.id), String(r.file_name ?? "Untitled"), found));
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
    const { data: rows, error } = await supabase
      .from("content")
      .select("id, file_name, detections, library_matches")
      .eq("user_id", userId);
    if (error) {
      console.error("Supabase patch detection:", error);
      return res.status(500).json({ error: "Failed to update detection", details: error.message });
    }
    for (const row of rows ?? []) {
      const r = row as Record<string, unknown>;
      const dets = extractDetectionsFromContentRow(String(r.id), String(r.file_name ?? "Untitled"), r);
      const idx = dets.findIndex((d) => d.id === id);
      if (idx < 0) continue;

      const lib = (r.library_matches ?? r.libraryMatches) as Record<string, unknown> | undefined;
      if (lib && Array.isArray(lib.matches)) {
        const libMatches = lib.matches as Array<Record<string, unknown> | null>;
        const nextMatches = libMatches.map((m, mIdx) => {
          if (!m || typeof m !== "object") return m;
          const mm = m as Record<string, unknown>;
          const url = typeof mm.url === "string" ? mm.url : "";
          const computedId = `${String(r.id)}-lib-${mIdx}-${Buffer.from(url)
            .toString("base64")
            .replace(/=+$/g, "")
            .slice(0, 12)}`;
          if (computedId !== id) return m;
          return {
            ...mm,
            reviewStatus: body.status,
          };
        });
        const { error: upErr } = await supabase
          .from("content")
          .update({ library_matches: { ...lib, matches: nextMatches } })
          .eq("id", String(r.id));
        if (upErr) {
          console.error("Supabase patch detection update:", upErr);
          return res.status(500).json({ error: "Failed to update detection", details: upErr.message });
        }
      } else {
        const next = [...dets];
        next[idx] = { ...next[idx], status: body.status };
        const { error: upErr } = await supabase.from("content").update({ detections: next }).eq("id", String(r.id));
        if (upErr) {
          console.error("Supabase patch detection update:", upErr);
          return res.status(500).json({ error: "Failed to update detection", details: upErr.message });
        }
      }

      const updated = { ...dets[idx], status: body.status };
      return res.json(toDetectionApiItem(String(r.id), String(r.file_name ?? "Untitled"), updated));
    }
    return res.status(404).json({ error: "Not found" });
  }

  // Try local persisted content-backed detections first.
  const contentRows = await db.select().from(contentTable).where(eq(contentTable.ownerId, userId));
  for (const row of contentRows as any[]) {
    const contentId = String(row.uuid);
    const contentTitle = String(row.title ?? "Untitled");
    const dets = extractDetectionsFromContentRow(contentId, contentTitle, row as Record<string, unknown>);
    const idx = dets.findIndex((d) => d.id === id);
    if (idx < 0) continue;

    const lib = (row.libraryMatches ?? row.library_matches) as Record<string, unknown> | undefined;
    if (lib && Array.isArray(lib.matches)) {
      const libMatches = lib.matches as Array<Record<string, unknown> | null>;
      const nextMatches = libMatches.map((m, mIdx) => {
        if (!m || typeof m !== "object") return m;
        const mm = m as Record<string, unknown>;
        const url = typeof mm.url === "string" ? mm.url : "";
        const computedId = `${contentId}-lib-${mIdx}-${Buffer.from(url).toString("base64").replace(/=+$/g, "").slice(0, 12)}`;
        if (computedId !== id) return m;
        return {
          ...mm,
          reviewStatus: body.status,
        };
      });

      await db
        .update(contentTable)
        .set({ libraryMatches: { ...lib, matches: nextMatches } } as any)
        .where(eq(contentTable.uuid, contentId))
        .where(eq(contentTable.ownerId, userId));

      const updated = { ...dets[idx], status: body.status };
      return res.json(toDetectionApiItem(contentId, contentTitle, updated));
    }

    break;
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
