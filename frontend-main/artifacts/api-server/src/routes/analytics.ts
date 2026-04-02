import { Router } from "express";
import { db, contentTable, detectionTable, desc, asc, eq } from "@workspace/db";
import { GetPropagationDataQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/analytics/overview", async (req, res) => {
  const userId = (req as any).userId;
  const contents = await db.select().from(contentTable).where(eq(contentTable.ownerId, userId));
  const detections = await db.select().from(detectionTable).where(eq(detectionTable.ownerId, userId));

  const totalContent = contents.length;
  const activeMonitoring = contents.filter((c) => c.status === "active" || c.status === "monitoring").length;
  const totalDetections = detections.length;
  const confirmedInfringements = detections.filter((d) => d.status === "confirmed").length;
  const pendingReview = detections.filter((d) => d.status === "pending").length;
  const avgSimilarityScore = detections.length
    ? (detections as any[]).reduce((sum, d) => sum + (d.similarityScore as number), 0) / detections.length
    : 0;
  const blockchainRegistered = contents.filter((c) => c.blockchainTxHash != null).length;

  const contentDetectionMap = new Map<string, { contentId: string; title: string; detections: number; scores: number[] }>();
  for (const d of detections) {
    if (!contentDetectionMap.has(d.contentId as string)) {
      contentDetectionMap.set(d.contentId as string, { contentId: d.contentId as string, title: d.contentTitle as string, detections: 0, scores: [] });
    }
    const entry = contentDetectionMap.get(d.contentId as string)!;
    entry.detections++;
    entry.scores.push(d.similarityScore as number);
  }

  const mostAffectedContent = Array.from(contentDetectionMap.values())
    .sort((a, b) => b.detections - a.detections)
    .slice(0, 5)
    .map((e) => ({
      contentId: e.contentId,
      title: e.title,
      detectionCount: e.detections,
      avgSimilarity: e.scores.reduce((s, v) => s + v, 0) / e.scores.length,
    }));

  const platformMap = new Map<string, number>();
  for (const d of detections) {
    const platform = d.sourcePlatform as string;
    platformMap.set(platform, (platformMap.get(platform) ?? 0) + 1);
  }
  const platformBreakdown = Array.from(platformMap.entries()).map(([platform, count]) => ({
    platform,
    count,
    percentage: totalDetections > 0 ? (count / totalDetections) * 100 : 0,
  }));

  return res.json({
    totalContent,
    activeMonitoring,
    totalDetections,
    confirmedInfringements,
    pendingReview,
    avgSimilarityScore: Math.round(avgSimilarityScore * 100) / 100,
    blockchainRegistered,
    mostAffectedContent,
    platformBreakdown,
  });
});

router.get("/analytics/propagation", async (req, res) => {
  const userId = (req as any).userId;
  const query = GetPropagationDataQueryParams.parse(req.query);
  const detections = await db.select().from(detectionTable).where(eq(detectionTable.ownerId, userId)).orderBy(desc(detectionTable.detectedAt)).limit(30);

  const filtered = query.contentId ? detections.filter((d) => d.contentId === query.contentId) : detections;

  const nodes = [
    {
      id: "origin",
      label: "Original Content",
      type: "origin" as const,
      platform: "Internal",
      url: "https://contentguard.io",
      similarityScore: 1.0,
      detectedAt: new Date().toISOString(),
    },
    ...filtered.slice(0, 20).map((d) => ({
      id: d.uuid,
      label: d.sourcePlatform,
      type: (d.similarityScore as any) > 0.9 ? ("copy" as const) : ("partial" as const),
      platform: d.sourcePlatform as string,
      url: d.sourceUrl as string,
      similarityScore: d.similarityScore as number,
      detectedAt: (d.detectedAt instanceof Date) ? d.detectedAt.toISOString() : new Date(d.detectedAt as any).toISOString(),
    })),
  ];

  const links = filtered.slice(0, 20).map((d) => ({
    source: "origin",
    target: d.uuid,
    weight: d.similarityScore,
  }));

  return res.json({ nodes, links });
});

router.get("/analytics/trends", async (req, res) => {
  const userId = (req as any).userId;
  const detections = await db.select().from(detectionTable).where(eq(detectionTable.ownerId, userId)).orderBy(asc(detectionTable.detectedAt));

  const dailyMap = new Map<string, { detections: number; confirmed: number; dismissed: number }>();
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dailyMap.set(key, { detections: 0, confirmed: 0, dismissed: 0 });
  }

  for (const d of detections) {
    const detectedAt = (d.detectedAt instanceof Date) ? d.detectedAt : new Date(d.detectedAt as any);
    const key = detectedAt.toISOString().split("T")[0];
    if (dailyMap.has(key)) {
      const entry = dailyMap.get(key)!;
      entry.detections++;
      if (d.status === "confirmed") entry.confirmed++;
      if (d.status === "dismissed") entry.dismissed++;
    }
  }

  const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));

  const typeMap = new Map<string, number>();
  for (const d of detections) {
    const type = d.detectionType as string;
    typeMap.set(type, (typeMap.get(type) ?? 0) + 1);
  }
  const byType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

  return res.json({ daily, byType });
});

export default router;
