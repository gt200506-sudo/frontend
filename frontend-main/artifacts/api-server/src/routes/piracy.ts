import { Router } from "express";
import multer from "multer";
import { z } from "zod/v4";
import { Pool } from "pg";

import { db, contentTable, detectedContentTable, eq } from "@workspace/db";

import {
  hammingSimilarity,
  jaccardSimilarityFromJsonSet,
  perceptualHashImage,
  perceptualHashVideo,
  sha256ExactMatch,
  sha256Hex,
  textFingerprintPdf,
} from "../lib/piracyDetection";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const DetectPiracyBody = z.object({
  // Example: original crawler URL, or "platform:identifier"
  source: z.string().min(1),
});

const databaseUrl = process.env.DATABASE_URL;
// In this repo, local dev uses an in-memory DB with a mocked DATABASE_URL.
// When DATABASE_URL looks real, query Postgres directly so comparisons hit Supabase storage.
const usePostgres = !!databaseUrl && !databaseUrl.includes("mock:mock@");
const pool = usePostgres ? new Pool({ connectionString: databaseUrl }) : null;

router.post("/detect-piracy", upload.single("file"), async (req, res) => {
  try {
    const body = DetectPiracyBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Invalid request", details: body.error.flatten() });

    const source = body.data.source;
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const userId = (req as any).userId as string | null;

    // 1. SHA-256 hash for exact-match comparisons.
    const incomingSha256 = await sha256Hex(file.buffer);
    const incomingHashVariants = new Set([incomingSha256, `sha256:${incomingSha256}`]);

    // Load known registered content from Supabase/Postgres (or the in-memory DB in dev).
    let knownContents: any[];
    if (pool) {
      const { rows } = await pool.query(
        `
          SELECT
            uuid,
            title,
            content_hash,
            perceptual_hash,
            text_fingerprint,
            similarity_threshold
          FROM content
          WHERE status IN ('active', 'monitoring')
        `,
      );
      knownContents = rows.map((r: any) => ({
        uuid: r.uuid,
        title: r.title,
        contentHash: r.content_hash,
        perceptualHash: r.perceptual_hash,
        textFingerprint: r.text_fingerprint,
        similarityThreshold: r.similarity_threshold,
      }));
    } else {
      const knownQuery = userId ? db.select().from(contentTable).where(eq(contentTable.ownerId, userId)) : db.select().from(contentTable);
      knownContents = await knownQuery;
    }

    // 2. Exact match => High Confidence Piracy
    let exactMatch: any | null = null;
    for (const c of knownContents as any[]) {
      if (incomingHashVariants.has(String(c.contentHash))) {
        exactMatch = c;
        break;
      }
      // Also support records stored with/without the "sha256:" prefix.
      if (sha256ExactMatch(incomingSha256, c.contentHash)) {
        exactMatch = c;
        break;
      }
    }

    if (exactMatch) {
      const matchedFile = exactMatch.title ?? exactMatch.uuid ?? null;
      if (pool) {
        await pool.query(
          `INSERT INTO detected_content (source, similarity_score, matched_file, detected_at) VALUES ($1, $2, $3, NOW())`,
          [source, 1, matchedFile],
        );
      } else {
        await db.insert(detectedContentTable).values({
          source,
          similarityScore: 1,
          matchedFile,
          detectedAt: new Date(),
        });
      }

      return res.json({
        confidence: "High Confidence Piracy",
        similarityScore: 1,
        matched: {
          contentId: exactMatch.uuid,
          title: exactMatch.title,
        },
      });
    }

    // 3. Similar match => Probable Piracy
    const mimetype = file.mimetype ?? "";
    const isImage = mimetype.startsWith("image/");
    const isVideo = mimetype.startsWith("video/");
    const isPdf = mimetype.toLowerCase() === "application/pdf";

    let incomingPerceptualHash: string | null = null;
    let incomingTextFingerprint: string | null = null;

    if (isImage) {
      try {
        incomingPerceptualHash = await perceptualHashImage(file.buffer);
      } catch (e) {
        console.warn("Perceptual hash computation failed (image):", (e as any)?.message ?? e);
      }
    } else if (isVideo) {
      try {
        incomingPerceptualHash = await perceptualHashVideo(file.buffer, mimetype, file.originalname);
      } catch (e) {
        console.warn("Perceptual hash computation failed (video):", (e as any)?.message ?? e);
      }
    } else if (isPdf) {
      try {
        incomingTextFingerprint = await textFingerprintPdf(file.buffer);
      } catch (e) {
        console.warn("PDF text fingerprint computation failed (pdf):", (e as any)?.message ?? e);
      }
    }

    let best: { content: any; similarityScore: number } | null = null;

    if (incomingPerceptualHash) {
      for (const c of knownContents as any[]) {
        const stored = c.perceptualHash as string | null | undefined;
        if (!stored) continue;
        const sim = hammingSimilarity(incomingPerceptualHash, String(stored));
        if (sim == null) continue;
        if (!best || sim > best.similarityScore) best = { content: c, similarityScore: sim };
      }
    }

    if (!best && incomingTextFingerprint) {
      for (const c of knownContents as any[]) {
        const stored = c.textFingerprint as string | null | undefined;
        if (!stored) continue;
        const sim = jaccardSimilarityFromJsonSet(incomingTextFingerprint, String(stored));
        if (sim == null) continue;
        if (!best || sim > best.similarityScore) best = { content: c, similarityScore: sim };
      }
    }

    const bestSimilarity = best?.similarityScore ?? 0;
    const matchedFile = best?.content?.title ?? best?.content?.uuid ?? null;

    // Store result regardless (matched_file can be null when no similarity threshold is met).
    if (pool) {
      await pool.query(
        `INSERT INTO detected_content (source, similarity_score, matched_file, detected_at) VALUES ($1, $2, $3, NOW())`,
        [source, bestSimilarity, matchedFile],
      );
    } else {
      await db.insert(detectedContentTable).values({
        source,
        similarityScore: bestSimilarity,
        matchedFile,
        detectedAt: new Date(),
      });
    }

    const threshold = best?.content?.similarityThreshold ?? 0.85;
    if (best && bestSimilarity >= threshold) {
      return res.json({
        confidence: "Probable Piracy",
        similarityScore: bestSimilarity,
        matched: {
          contentId: best.content.uuid,
          title: best.content.title,
        },
      });
    }

    return res.json({
      confidence: "No Piracy Detected",
      similarityScore: bestSimilarity,
      matched: null,
    });
  } catch (e: any) {
    console.error("detect-piracy error:", e);
    return res.status(500).json({ error: "Internal server error", message: e?.message ?? String(e) });
  }
});

export default router;

