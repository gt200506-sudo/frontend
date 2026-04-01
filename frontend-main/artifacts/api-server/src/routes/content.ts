import { Router } from "express";
import { db, contentTable, eq, desc } from "@workspace/db";
import { randomUUID } from "crypto";
import {
  ListContentQueryParams,
  RegisterContentBody,
  GetContentParams,
  DeleteContentParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/content", async (req, res) => {
  const query = ListContentQueryParams.parse(req.query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  let baseQuery = db.select().from(contentTable).orderBy(desc(contentTable.registeredAt));

  const allItems = await baseQuery;
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
    registeredAt: c.registeredAt.toISOString(),
    blockchainTxHash: c.blockchainTxHash ?? null,
    ipfsHash: c.ipfsHash ?? null,
    detectionCount: c.detectionCount,
    status: c.status,
    similarityThreshold: c.similarityThreshold,
  }));

  res.json({ items, total: filtered.length, page, limit });
});

router.post("/content", async (req, res) => {
  const body = RegisterContentBody.parse(req.body);
  const uuid = randomUUID();
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
    })
    .returning();

  res.status(201).json({
    id: inserted.uuid,
    title: inserted.title,
    type: inserted.type,
    description: inserted.description ?? undefined,
    contentHash: inserted.contentHash,
    fileSize: inserted.fileSize ?? undefined,
    author: inserted.author,
    organization: inserted.organization,
    registeredAt: inserted.registeredAt.toISOString(),
    blockchainTxHash: null,
    ipfsHash: null,
    detectionCount: 0,
    status: inserted.status,
    similarityThreshold: inserted.similarityThreshold,
  });
});

router.get("/content/:id", async (req, res) => {
  const { id } = GetContentParams.parse(req.params);
  const [item] = await db.select().from(contentTable).where(eq(contentTable.uuid, id));
  if (!item) return res.status(404).json({ error: "Not found" });

  res.json({
    id: item.uuid,
    title: item.title,
    type: item.type,
    description: item.description ?? undefined,
    contentHash: item.contentHash,
    fileSize: item.fileSize ?? undefined,
    author: item.author,
    organization: item.organization,
    registeredAt: item.registeredAt.toISOString(),
    blockchainTxHash: item.blockchainTxHash ?? null,
    ipfsHash: item.ipfsHash ?? null,
    detectionCount: item.detectionCount,
    status: item.status,
    similarityThreshold: item.similarityThreshold,
  });
});

router.delete("/content/:id", async (req, res) => {
  const { id } = DeleteContentParams.parse(req.params);
  await db.delete(contentTable).where(eq(contentTable.uuid, id));
  res.status(204).send();
});

export default router;
