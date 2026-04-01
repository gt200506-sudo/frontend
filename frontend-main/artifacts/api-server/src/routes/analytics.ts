import { Router } from "express";
import { db, contentTable, detectionTable, desc, asc } from "@workspace/db";
import { GetPropagationDataQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/analytics/overview", async (_req, res) => {
  const contents = await db.select().from(contentTable);
  const detections = await db.select().from(detectionTable);

  const totalContent = contents.length;
  const activeMonitoring = contents.filter((c) => c.status === "active" || c.status === "monitoring").length;
  const totalDetections = detections.length;
  const confirmedInfringements = detections.filter((d) => d.status === "confirmed").length;
  const pendingReview = detections.filter((d) => d.status === "pending").length;
  const avgSimilarityScore = detections.length
    ? detections.reduce((sum, d) => sum + d.similarityScore, 0) / detections.length
    : 0;
  const blockchainRegistered = contents.filter((c) => c.blockchainTxHash != null).length;

  const contentDetectionMap = new Map<string, { contentId: string; title: string; detections: number; scores: number[] }>();
  for (const d of detections) {
    if (!contentDetectionMap.has(d.contentId)) {
      contentDetectionMap.set(d.contentId, { contentId: d.contentId, title: d.contentTitle, detections: 0, scores: [] });
    }
    const entry = contentDetectionMap.get(d.contentId)!;
    entry.detections++;
    entry.scores.push(d.similarityScore);
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
    platformMap.set(d.sourcePlatform, (platformMap.get(d.sourcePlatform) ?? 0) + 1);
  }
  const platformBreakdown = Array.from(platformMap.entries()).map(([platform, count]) => ({
    platform,
    count,
    percentage: totalDetections > 0 ? (count / totalDetections) * 100 : 0,
  }));

  res.json({
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
  const query = GetPropagationDataQueryParams.parse(req.query);
  const detections = await db.select().from(detectionTable).orderBy(desc(detectionTable.detectedAt)).limit(30);

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
      type: d.similarityScore > 0.9 ? ("copy" as const) : ("partial" as const),
      platform: d.sourcePlatform,
      url: d.sourceUrl,
      similarityScore: d.similarityScore,
      detectedAt: d.detectedAt.toISOString(),
    })),
  ];

  const links = filtered.slice(0, 20).map((d) => ({
    source: "origin",
    target: d.uuid,
    weight: d.similarityScore,
  }));

  res.json({ nodes, links });
});

router.get("/analytics/trends", async (_req, res) => {
  const detections = await db.select().from(detectionTable).orderBy(asc(detectionTable.detectedAt));

  const dailyMap = new Map<string, { detections: number; confirmed: number; dismissed: number }>();
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dailyMap.set(key, { detections: 0, confirmed: 0, dismissed: 0 });
  }

  for (const d of detections) {
    const key = d.detectedAt.toISOString().split("T")[0];
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
    typeMap.set(d.detectionType, (typeMap.get(d.detectionType) ?? 0) + 1);
  }
  const byType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

  res.json({ daily, byType });
});

export default router;
