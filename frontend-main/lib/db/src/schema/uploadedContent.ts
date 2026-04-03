import { createInsertSchema } from "drizzle-zod";
import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const uploadedContentTable = pgTable("uploaded_content", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  ipfsHash: text("ipfs_hash").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  scanResults: jsonb("scan_results").$type<string[]>().notNull().default([]),
});

export const insertUploadedContentSchema = createInsertSchema(uploadedContentTable).omit({ id: true });

export type UploadedContent = typeof uploadedContentTable.$inferSelect;
export type InsertUploadedContent = z.infer<typeof insertUploadedContentSchema>;
