import { Router } from "express";
import { db, contentTable, detectionTable, desc, asc, eq } from "@workspace/db";
import { GetPropagationDataQueryParams } from "@workspace/api-zod";
import { getSupabaseServer } from "../lib/supabase";
import { extractDetectionsFromContentRow, toDetectionApiItem } from "../lib/detectionFromContent";

const router = Router();

async function getUnifiedDetections(userId: string) {
  const supabase = getSupabaseServer();
  if (supabase) {
    const { data, error } = await supabase
      .from("content")
      .select("id, file_name, detections, library_matches, created_at")
      .eq("user_id", userId);
    if (error) throw new Error(`Supabase detections load failed: ${error.message}`);

    const out: Array<ReturnType<typeof toDetectionApiItem> & { createdAt?: string }> = [];
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      const contentId = String(r.id);
      const title = String(r.file_name ?? "Untitled");
      const dets = extractDetectionsFromContentRow(contentId, title, r);
      out.push(...dets.map((d) => ({ ...toDetectionApiItem(contentId, title, d), createdAt: String(r.created_at ?? "") })));
    }
    return out;
  }

  const contentRows = await db.select().from(contentTable).where(eq(contentTable.ownerId, userId));
  const fromContent = (contentRows as any[]).flatMap((row) => {
    const contentId = String(row.uuid);
    const title = String(row.title ?? "Untitled");
    const dets = extractDetectionsFromContentRow(contentId, title, row as Record<string, unknown>);
    return dets.map((d) => toDetectionApiItem(contentId, title, d));
  });

  const fromTable = await db.select().from(detectionTable).where(eq(detectionTable.ownerId, userId));
  const normalized = fromTable.map((d) => ({
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

  const dedupe = new Map<string, (typeof normalized)[number]>();
  for (const d of [...fromContent, ...normalized]) {
    dedupe.set(`${d.contentId}|${d.sourceUrl}|${d.detectedAt}`, d);
  }
  return Array.from(dedupe.values());
}

router.get("/analytics/overview", async (req, res) => {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const supabase = getSupabaseServer();
  const contents = supabase
    ? ((await supabase.from("content").select("id, file_name, scan_status, user_id").eq("user_id", userId)).data ?? []).map(
        (c: any) => ({
          uuid: c.id,
          title: c.file_name,
          status: c.scan_status === "archived" ? "archived" : "active",
          blockchainTxHash: null,
        }),
      )
    : await db.select().from(contentTable).where(eq(contentTable.ownerId, userId));
  const detections = await getUnifiedDetections(userId);
  console.log("[analytics/overview] counts", { content: contents.length, detections: detections.length });

  const totalContent = contents.length;
  const activeMonitoring = contents.filter((c) => c.status === "active" || c.status === "monitoring").length;
  const totalDetections = detections.length;
  const confirmedInfringements = detections.filter((d) => d.status === "confirmed").length;
  const pendingReview = detections.filter((d) => d.status === "pending").length;
  const avgSimilarityScore = detections.length
    ? (detections as any[]).reduce((sum, d) => sum + Number(d.similarityScore || 0), 0) / detections.length
    : 0;
  const blockchainRegistered = contents.filter((c) => c.blockchainTxHash != null).length;

  const contentDetectionMap = new Map<string, { contentId: string; title: string; detections: number; scores: number[] }>();
  for (const d of detections as any[]) {
    if (!contentDetectionMap.has(String(d.contentId))) {
      contentDetectionMap.set(String(d.contentId), { contentId: String(d.contentId), title: String(d.contentTitle), detections: 0, scores: [] });
    }
    const entry = contentDetectionMap.get(String(d.contentId))!;
    entry.detections++;
    entry.scores.push(Number(d.similarityScore || 0));
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
  for (const d of detections as any[]) {
    const platform = String(d.sourcePlatform || "web");
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
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const query = GetPropagationDataQueryParams.parse(req.query);
  const detections = (await getUnifiedDetections(userId)).sort(
    (a, b) => new Date(String(b.detectedAt)).getTime() - new Date(String(a.detectedAt)).getTime(),
  );

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
      id: d.id,
      label: d.sourcePlatform,
      type: (d.similarityScore as any) > 0.9 ? ("copy" as const) : ("partial" as const),
      platform: d.sourcePlatform as string,
      url: d.sourceUrl as string,
      similarityScore: d.similarityScore as number,
      detectedAt: new Date(String(d.detectedAt)).toISOString(),
    })),
  ];

  const links = filtered.slice(0, 20).map((d) => ({
    source: "origin",
    target: d.id,
    weight: d.similarityScore,
  }));

  return res.json({ nodes, links });
});

router.get("/propagation-network/:contentId", async (req, res) => {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const contentId = String(req.params.contentId || "");
  const detections = (await getUnifiedDetections(userId))
    .filter((d) => d.contentId === contentId)
    .sort((a, b) => new Date(String(a.detectedAt)).getTime() - new Date(String(b.detectedAt)).getTime());

  const now = Date.now();
  const base = [
    {
      id: `${contentId}-source`,
      title: "Original Content",
      timestamp: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      type: "source",
      score: 100,
    },
  ];

  const detectionEvents = detections.map((d, index) => ({
    id: d.id || `${contentId}-d-${index}`,
    title: d.sourcePlatform || "Web",
    timestamp: String(d.detectedAt),
    type: "detection",
    score: Math.round((Number(d.similarityScore || 0) * 100)),
  }));

  const shareEvents =
    detectionEvents.length > 0
      ? detectionEvents.slice(0, 4).map((d, idx) => ({
          id: `${d.id}-share`,
          title: `${d.title} reshared`,
          timestamp: new Date(new Date(d.timestamp).getTime() + (idx + 1) * 1000 * 60 * 40).toISOString(),
          type: "share",
          score: Math.max(20, d.score - 10),
        }))
      : [];

  const timeline = [...base, ...detectionEvents, ...shareEvents].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  if (timeline.length <= 1) {
    const mock = [0, 1, 2, 3].map((i) => ({
      id: `${contentId}-mock-${i}`,
      title: i === 0 ? "Original Content" : i % 2 ? "Detected mirror" : "Social share",
      timestamp: new Date(now - (4 - i) * 1000 * 60 * 60).toISOString(),
      type: i === 0 ? "source" : i % 2 ? "detection" : "share",
      score: i === 0 ? 100 : 45 + i * 10,
    }));
    return res.json(mock);
  }

  return res.json(timeline);
});

router.get("/analytics/trends", async (req, res) => {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const detections = (await getUnifiedDetections(userId)).sort(
    (a, b) => new Date(String(a.detectedAt)).getTime() - new Date(String(b.detectedAt)).getTime(),
  );

  const dailyMap = new Map<string, { detections: number; confirmed: number; dismissed: number }>();
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dailyMap.set(key, { detections: 0, confirmed: 0, dismissed: 0 });
  }

  for (const d of detections as any[]) {
    const detectedAt = new Date(String(d.detectedAt));
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
  for (const d of detections as any[]) {
    const type = String(d.detectionType || "unknown");
    typeMap.set(type, (typeMap.get(type) ?? 0) + 1);
  }
  const byType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

  return res.json({ daily, byType });
});

export default router;
