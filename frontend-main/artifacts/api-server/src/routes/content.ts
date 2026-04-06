import { Router } from "express";
import { db, contentTable, eq, desc } from "@workspace/db";
import { randomUUID } from "crypto";
import {
  ListContentQueryParams,
  RegisterContentBody,
  GetContentParams,
  DeleteContentParams,
} from "@workspace/api-zod";
import { getSupabaseServer } from "../lib/supabase";
import { mapSupabaseContentRow } from "../lib/supabaseContentMap";

const router = Router();

router.get("/content", async (req, res) => {
  const query = ListContentQueryParams.parse(req.query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const userId = (req as any).userId as string | null;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = getSupabaseServer();
  if (supabase) {
    const { data, error } = await supabase
      .from("content")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    console.log("Fetched content:", data);

    if (error) {
      console.error("Supabase list content error:", error);
      return res.status(500).json({ error: "Failed to load content", details: error.message });
    }

    const rows = data ?? [];
    const mapped = rows.map((row) => mapSupabaseContentRow(row as Record<string, unknown>));
    const filtered = query.type ? mapped.filter((c) => c.type === query.type) : mapped;
    const items = filtered.slice(offset, offset + limit);

    return res.json({ items, total: filtered.length, page, limit });
  }

  const allItems = await db
    .select()
    .from(contentTable)
    .where(eq(contentTable.ownerId, userId))
    .orderBy(desc(contentTable.registeredAt));
  const filtered = query.type ? allItems.filter((c) => c.type === query.type) : allItems;
  const items = filtered.slice(offset, offset + limit).map((c) => ({
    id: c.uuid,
    title: c.title,
    type: c.type,
    description: c.description ?? undefined,
    contentHash: c.contentHash,
    fileSize: c.fileSize ?? undefined,
    author: c.author,
    organization: c.organization,
    registeredAt: (c.registeredAt instanceof Date) ? c.registeredAt.toISOString() : new Date(c.registeredAt as any).toISOString(),
    blockchainTxHash: c.blockchainTxHash ?? null,
    ipfsHash: c.ipfsHash ?? null,
    detectionCount: c.detectionCount,
    status: c.status,
    similarityThreshold: c.similarityThreshold,
    excerpt: c.excerpt,
    aiAnalysis: c.aiAnalysis ?? null,
    // Local dev DB persistence for AI detection results (/api/detect-content).
    libraryMatches: (c as any).libraryMatches ?? (c as any).library_matches ?? undefined,
  }));

  return res.json({ items, total: filtered.length, page, limit });
});

router.post("/content", async (req, res) => {
  const body = RegisterContentBody.parse(req.body);
  const uuid = randomUUID();
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = getSupabaseServer();
  if (supabase) {
    const { error } = await supabase.from("content").insert({
      id: uuid,
      user_id: userId,
      file_name: body.title,
      file_type: body.type,
      ipfs_hash: null,
      gateway_url: null,
      content_hash: body.contentHash,
    });
    if (error) {
      console.error("Supabase insert failed:", error);
      return res.status(500).json({ error: "Failed to save content", details: error.message });
    }

    return res.status(201).json({
      id: uuid,
      title: body.title,
      type: body.type,
      description: body.description ?? undefined,
      contentHash: body.contentHash,
      fileSize: undefined,
      author: body.author,
      organization: body.organization,
      registeredAt: new Date().toISOString(),
      blockchainTxHash: null,
      ipfsHash: null,
      detectionCount: 0,
      status: "active",
      similarityThreshold: body.similarityThreshold ?? 0.85,
      excerpt: undefined,
      aiAnalysis: null,
    });
  }

  const [inserted] = await db
    .insert(contentTable)
    .values({
      uuid,
      title: body.title,
      type: body.type,
      description: body.description ?? null,
      contentHash: body.contentHash,
      author: body.author,
      organization: body.organization,
      similarityThreshold: body.similarityThreshold ?? 0.85,
      status: "active",
      detectionCount: 0,
      ownerId: userId,
    })
    .returning();

  return res.status(201).json({
    id: inserted.uuid,
    title: inserted.title,
    type: inserted.type,
    description: inserted.description ?? undefined,
    contentHash: inserted.contentHash,
    fileSize: inserted.fileSize ?? undefined,
    author: inserted.author,
    organization: inserted.organization,
    registeredAt: (inserted.registeredAt instanceof Date) ? inserted.registeredAt.toISOString() : new Date(inserted.registeredAt as any).toISOString(),
    blockchainTxHash: null,
    ipfsHash: null,
    detectionCount: 0,
    status: inserted.status,
    similarityThreshold: inserted.similarityThreshold,
    excerpt: inserted.excerpt,
    aiAnalysis: inserted.aiAnalysis ?? null,
  });
});

router.get("/content/:id", async (req, res) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { id } = GetContentParams.parse(req.params);

  const supabase = getSupabaseServer();
  if (supabase) {
    const { data, error } = await supabase
      .from("content")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Supabase get content error:", error);
      return res.status(500).json({ error: "Failed to load content", details: error.message });
    }
    if (!data) return res.status(404).json({ error: "Not found" });
    return res.json(mapSupabaseContentRow(data as Record<string, unknown>));
  }

  const [item] = await db.select().from(contentTable).where(eq(contentTable.uuid, id));
  if (!item || item.ownerId !== userId) return res.status(404).json({ error: "Not found" });

  return res.json({
    id: item.uuid,
    title: item.title,
    type: item.type,
    description: item.description ?? undefined,
    contentHash: item.contentHash,
    fileSize: item.fileSize ?? undefined,
    author: item.author,
    organization: item.organization,
    registeredAt: (item.registeredAt instanceof Date) ? item.registeredAt.toISOString() : new Date(item.registeredAt as any).toISOString(),
    blockchainTxHash: item.blockchainTxHash ?? null,
    ipfsHash: item.ipfsHash ?? null,
    detectionCount: item.detectionCount,
    status: item.status,
    similarityThreshold: item.similarityThreshold,
    excerpt: item.excerpt,
    aiAnalysis: item.aiAnalysis ?? null,
  });
});

router.delete("/content/:id", async (req, res) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { id } = DeleteContentParams.parse(req.params);

  const supabase = getSupabaseServer();
  if (supabase) {
    const { error } = await supabase.from("content").delete().eq("id", id).eq("user_id", userId);
    if (error) {
      console.error("Supabase delete error:", error);
      return res.status(500).json({ error: "Failed to delete content", details: error.message });
    }
    return res.status(204).send();
  }

  await db.delete(contentTable).where(eq(contentTable.uuid, id)).where(eq(contentTable.ownerId, userId));
  return res.status(204).send();
});

export default router;
