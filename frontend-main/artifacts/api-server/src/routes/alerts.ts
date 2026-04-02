import { Router } from "express";
import { db, alertTable, eq, desc } from "@workspace/db";
import { ListAlertsQueryParams, MarkAlertReadParams } from "@workspace/api-zod";

const router = Router();

router.get("/alerts", async (req, res) => {
  const query = ListAlertsQueryParams.parse(req.query);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  const userId = (req as any).userId;
  const allItems = await db.select().from(alertTable).where(eq(alertTable.ownerId, userId)).orderBy(desc(alertTable.createdAt));

  let filtered = allItems;
  if (query.read != null) filtered = filtered.filter((a) => a.read === query.read);

  const unreadCount = allItems.filter((a) => !a.read).length;
  const items = filtered.slice(offset, offset + limit).map((a) => ({
    id: a.uuid,
    type: a.type,
    title: a.title,
    message: a.message,
    contentId: a.contentId ?? null,
    detectionId: a.detectionId ?? null,
    read: a.read,
    createdAt: (a.createdAt instanceof Date) ? a.createdAt.toISOString() : new Date(a.createdAt as any).toISOString(),
    severity: a.severity,
  }));

  res.json({ items, total: filtered.length, unreadCount, page, limit });
});

router.post("/alerts/:id/read", async (req, res) => {
  const userId = (req as any).userId;
  const { id } = MarkAlertReadParams.parse(req.params);
  const [updated] = await db
    .update(alertTable)
    .set({ read: true })
    .where(eq(alertTable.uuid, id))
    .where(eq(alertTable.ownerId, userId))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });

  return res.json({
    id: updated.uuid,
    type: updated.type,
    title: updated.title,
    message: updated.message,
    contentId: updated.contentId ?? null,
    detectionId: updated.detectionId ?? null,
    read: updated.read,
    createdAt: (updated.createdAt instanceof Date) ? updated.createdAt.toISOString() : new Date(updated.createdAt as any).toISOString(),
    severity: updated.severity,
  });
});

export default router;
