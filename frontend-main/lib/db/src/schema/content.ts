import { pgTable, text, serial, real, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentTypeEnum = pgEnum("content_type", ["paper", "course", "image", "document", "video"]);
export const contentStatusEnum = pgEnum("content_status", ["active", "monitoring", "archived"]);
export const detectionStatusEnum = pgEnum("detection_status", ["pending", "confirmed", "dismissed"]);
export const detectionTypeEnum = pgEnum("detection_type", ["exact", "paraphrase", "partial", "visual"]);
export const alertTypeEnum = pgEnum("alert_type", ["new_detection", "high_similarity", "blockchain_registered", "weekly_summary"]);
export const alertSeverityEnum = pgEnum("alert_severity", ["info", "warning", "critical"]);

export const contentTable = pgTable("content", {
  id: serial("id").primaryKey(),
  uuid: text("uuid").notNull().unique(),
  title: text("title").notNull(),
  type: contentTypeEnum("type").notNull(),
  description: text("description"),
  contentHash: text("content_hash").notNull(),
  // Used for piracy similarity detection across visually/textually similar files.
  // These are nullable because older registered content may only have SHA-256.
  perceptualHash: text("perceptual_hash"),
  textFingerprint: text("text_fingerprint"),
  fileSize: integer("file_size"),
  author: text("author").notNull(),
  organization: text("organization").notNull(),
  blockchainTxHash: text("blockchain_tx_hash"),
  ipfsHash: text("ipfs_hash"),
  detectionCount: integer("detection_count").notNull().default(0),
  status: contentStatusEnum("status").notNull().default("active"),
  similarityThreshold: real("similarity_threshold").notNull().default(0.85),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});

export const detectionTable = pgTable("detection", {
  id: serial("id").primaryKey(),
  uuid: text("uuid").notNull().unique(),
  contentId: text("content_id").notNull(),
  contentTitle: text("content_title").notNull(),
  similarityScore: real("similarity_score").notNull(),
  detectionType: detectionTypeEnum("detection_type").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourcePlatform: text("source_platform").notNull(),
  status: detectionStatusEnum("status").notNull().default("pending"),
  excerpt: text("excerpt").notNull(),
  aiAnalysis: text("ai_analysis"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
});

export const alertTable = pgTable("alert", {
  id: serial("id").primaryKey(),
  uuid: text("uuid").notNull().unique(),
  type: alertTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  contentId: text("content_id"),
  detectionId: text("detection_id"),
  read: boolean("read").notNull().default(false),
  severity: alertSeverityEnum("severity").notNull().default("info"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const blockchainRecordTable = pgTable("blockchain_record", {
  id: serial("id").primaryKey(),
  contentId: text("content_id").notNull().unique(),
  txHash: text("tx_hash").notNull(),
  blockNumber: integer("block_number").notNull(),
  network: text("network").notNull().default("polygon"),
  ipfsHash: text("ipfs_hash").notNull(),
  ownerAddress: text("owner_address").notNull(),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});

export const insertContentSchema = createInsertSchema(contentTable).omit({ id: true });
export const insertDetectionSchema = createInsertSchema(detectionTable).omit({ id: true });
export const insertAlertSchema = createInsertSchema(alertTable).omit({ id: true });
export const insertBlockchainRecordSchema = createInsertSchema(blockchainRecordTable).omit({ id: true });

export type Content = typeof contentTable.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
export type Detection = typeof detectionTable.$inferSelect;
export type InsertDetection = z.infer<typeof insertDetectionSchema>;
export type Alert = typeof alertTable.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type BlockchainRecord = typeof blockchainRecordTable.$inferSelect;
