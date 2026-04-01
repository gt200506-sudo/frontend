import { Router } from "express";
import { db, detectionTable, eq, desc } from "@workspace/db";
import {
  ListDetectionsQueryParams,
  GetDetectionParams,
  UpdateDetectionStatusParams,
  UpdateDetectionStatusBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/detections", async (req, res) => {
  const query = ListDetectionsQueryParams.parse(req.query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const allItems = await db.select().from(detectionTable).orderBy(desc(detectionTable.detectedAt));

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
    detectedAt: (d.detectedAt instanceof Date) ? d.detectedAt.toISOString() : new Date(d.detectedAt as any).toISOString(),
    status: d.status,
    excerpt: d.excerpt,
    aiAnalysis: d.aiAnalysis ?? null,
  }));

  return res.json({ items, total: filtered.length, page, limit });
});

router.get("/detections/:id", async (req, res) => {
  const { id } = GetDetectionParams.parse(req.params);
  const [item] = await db.select().from(detectionTable).where(eq(detectionTable.uuid, id));
  if (!item) return res.status(404).json({ error: "Not found" });

  return res.json({
    id: item.uuid,
    contentId: item.contentId,
    contentTitle: item.contentTitle,
    similarityScore: item.similarityScore,
    detectionType: item.detectionType,
    sourceUrl: item.sourceUrl,
    sourcePlatform: item.sourcePlatform,
    detectedAt: (item.detectedAt instanceof Date) ? item.detectedAt.toISOString() : new Date(item.detectedAt as any).toISOString(),
    status: item.status,
    excerpt: item.excerpt,
    aiAnalysis: item.aiAnalysis ?? null,
  });
});

router.patch("/detections/:id", async (req, res) => {
  const { id } = UpdateDetectionStatusParams.parse(req.params);
  const body = UpdateDetectionStatusBody.parse(req.body);

  const [updated] = await db
    .update(detectionTable)
    .set({ status: body.status })
    .where(eq(detectionTable.uuid, id))
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
    detectedAt: (updated.detectedAt instanceof Date) ? updated.detectedAt.toISOString() : new Date(updated.detectedAt as any).toISOString(),
    status: updated.status,
    excerpt: updated.excerpt,
    aiAnalysis: updated.aiAnalysis ?? null,
  });
});

export default router;
