import { createInsertSchema } from "drizzle-zod";
import { pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

// Stores the piracy detection outcome for crawler-submitted content.
export const detectedContentTable = pgTable("detected_content", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  similarityScore: real("similarity_score").notNull(),
  matchedFile: text("matched_file"), // nullable when no match is found
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
});

export const insertDetectedContentSchema = createInsertSchema(detectedContentTable).omit({ id: true });

export type DetectedContent = typeof detectedContentTable.$inferSelect;
export type InsertDetectedContent = z.infer<typeof insertDetectedContentSchema>;

