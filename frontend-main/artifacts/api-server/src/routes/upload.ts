import { Router } from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "node:fs";
import { unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "crypto";
import { db, contentTable, uploadedContentTable } from "@workspace/db";
import { getSupabaseServer } from "../lib/supabase";
import { perceptualHashImage, perceptualHashVideo, sha256Hex, textFingerprintPdf } from "../lib/piracyDetection";
import { runPiracyDetectionPipeline } from "../services/piracyPipeline";
import { prepareTextForContentRow } from "../services/contentTextExtraction";

const router = Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${randomUUID()}-${file.originalname}`),
  }),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
});
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

function getPinataEnv() {
  return {
    jwt: process.env.PINATA_JWT,
    apiKey: process.env.PINATA_API_KEY,
    apiSecret: process.env.PINATA_SECRET_API_KEY || process.env.PINATA_API_SECRET,
  };
}

async function uploadToPinata(filePath: string, fileName: string, ownerId: string, sha256: string) {
  const { jwt: PINATA_JWT, apiKey: PINATA_API_KEY, apiSecret: PINATA_API_SECRET } = getPinataEnv();
  const data = new FormData();
  data.append("file", fs.createReadStream(filePath), { filename: fileName });
  data.append("pinataMetadata", JSON.stringify({ name: fileName, keyvalues: { ownerId, sha256 } }));
  data.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const headers = {
    ...data.getHeaders(),
    ...(PINATA_JWT
      ? { Authorization: `Bearer ${PINATA_JWT}` }
      : { pinata_api_key: PINATA_API_KEY ?? "", pinata_secret_api_key: PINATA_API_SECRET ?? "" }),
  };

  if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_API_SECRET)) {
    const err = new Error("Pinata credentials are missing");
    (err as any).statusCode = 500;
    throw err;
  }

  const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", data, {
    maxBodyLength: Infinity,
    headers,
  });
  return res.data;
}

router.post("/content/upload", (req, res) => {
  upload.single("file")(req, res, async (uploadErr: any) => {
    if (uploadErr) {
      if (uploadErr?.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File size too large. Max upload size is 25MB." });
      }
      return res.status(400).json({ error: "Upload failed", details: uploadErr?.message ?? String(uploadErr) });
    }
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return res.status(400).json({ error: "Unsupported file type. Allowed: JPG, PNG, PDF, DOCX, TXT." });
      }

      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Read uploaded file from disk for hash/fingerprint + Pinata stream upload.
      const fileBuffer = await fs.promises.readFile(file.path);
      const hash = await sha256Hex(fileBuffer);

      let perceptualHash: string | null = null;
      let textFingerprint: string | null = null;

      try {
        if (file.mimetype?.startsWith("image/")) {
          perceptualHash = await perceptualHashImage(fileBuffer);
        } else if (file.mimetype?.startsWith("video/")) {
          perceptualHash = await perceptualHashVideo(fileBuffer, file.mimetype, file.originalname);
        }
      } catch (e) {
        console.warn("Perceptual hash computation failed (upload):", (e as any)?.message ?? e);
      }

      try {
        if ((file.mimetype ?? "").toLowerCase() === "application/pdf") {
          textFingerprint = await textFingerprintPdf(fileBuffer);
        }
      } catch (e) {
        console.warn("PDF text fingerprint computation failed (upload):", (e as any)?.message ?? e);
      }

      const pinataResponse = await uploadToPinata(file.path, path.basename(file.originalname), userId, hash);
      console.log("Pinata Response:", pinataResponse);

      const ipfsHash = pinataResponse?.IpfsHash;
      if (!ipfsHash) {
        return res.status(502).json({ error: "Pinata did not return IpfsHash" });
      }
      const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

      const preparedText = await prepareTextForContentRow(fileBuffer, file.mimetype, file.originalname);

      const supabase = getSupabaseServer();
      if (supabase) {
        const rowId = randomUUID();
        const { error: sbError } = await supabase.from("content").insert({
          id: rowId,
          user_id: userId,
          file_name: file.originalname,
          file_type: file.mimetype,
          ipfs_hash: ipfsHash,
          gateway_url: gatewayUrl,
          content_hash: hash,
          perceptual_hash: perceptualHash,
          text_snippet: preparedText.textSnippet,
          full_text: preparedText.fullText,
          scan_status: "scanning",
          detections: [],
        });
        if (sbError) {
          console.error("Supabase insert failed:", sbError);
          return res.status(500).json({
            error: "Failed to persist content metadata",
            details: sbError.message,
          });
        }

        const pipelineBuffer = Buffer.from(fileBuffer);
        setImmediate(() => {
          void runPiracyDetectionPipeline({
            supabase,
            contentId: rowId,
            userId,
            fileName: file.originalname,
            buffer: pipelineBuffer,
            mimeType: file.mimetype,
            sha256: hash,
            ipfsCid: ipfsHash,
            perceptualHash,
          });
        });

        return res.status(201).json({
          success: true,
          ipfsHash,
          gatewayUrl,
          data: {
            uploadId: null,
            id: rowId,
            ipfsHash,
            gatewayUrl,
            contentHash: hash,
            title: file.originalname,
            fileType: file.mimetype,
            uploadedAt: new Date().toISOString(),
            pinSize: pinataResponse?.PinSize ?? null,
            timestamp: pinataResponse?.Timestamp ?? null,
            scanResults: [],
            scanStatus: "scanning",
          },
        });
      }

      const [uploadedMeta] = await db
        .insert(uploadedContentTable)
        .values({
          userId,
          fileName: file.originalname,
          fileType: file.mimetype,
          ipfsHash,
          uploadedAt: new Date(),
          scanResults: [],
        })
        .returning();
      const uploadedAt = uploadedMeta?.uploadedAt instanceof Date ? uploadedMeta.uploadedAt : new Date();

      const uuid = randomUUID();
      const [inserted] = await db
        .insert(contentTable)
        .values({
          uuid,
          title: file.originalname,
          type: file.mimetype.startsWith("video") ? "video" : file.mimetype.startsWith("image") ? "image" : "document",
          description:
            preparedText.textSnippet ??
            (preparedText.rejected
              ? "No extractable text for web detection (use text, PDF, DOCX, or clear image text)."
              : "Uploaded via ContentGuard IPFS integration"),
          extractedFullText: preparedText.fullText,
          contentHash: hash,
          perceptualHash,
          textFingerprint,
          fileSize: file.size,
          author: "Unknown Author",
          organization: "ContentGuard Community",
          similarityThreshold: 0.85,
          status: "active",
          detectionCount: 0,
          ipfsHash,
          ownerId: userId,
          registeredAt: new Date(),
        })
        .returning();

      const pipelineBuffer = Buffer.from(fileBuffer);
      setImmediate(() => {
        void runPiracyDetectionPipeline({
          supabase: null,
          contentId: uuid,
          userId,
          fileName: file.originalname,
          buffer: pipelineBuffer,
          mimeType: file.mimetype,
          sha256: hash,
          ipfsCid: ipfsHash,
          perceptualHash,
        });
      });

      return res.status(201).json({
        success: true,
        ipfsHash,
        gatewayUrl,
        data: {
          uploadId: uploadedMeta?.id ?? null,
          id: inserted.uuid,
          ipfsHash: inserted.ipfsHash,
          gatewayUrl,
          contentHash: inserted.contentHash,
          title: inserted.title,
          fileType: file.mimetype,
          uploadedAt: uploadedAt.toISOString(),
          pinSize: pinataResponse?.PinSize ?? null,
          timestamp: pinataResponse?.Timestamp ?? null,
          scanResults: [],
          scanStatus: "scanning",
        },
      });
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return res.status(401).json({ error: "Pinata authentication failed. Check PINATA_JWT/API keys." });
      }
      console.error("Upload error:", error?.response?.data || error?.message || error);
      return res.status(500).json({ error: "Upload failed", message: error?.message ?? "Unknown error" });
    } finally {
      const file = (req as any).file;
      if (file?.path) {
        await unlink(file.path).catch(() => undefined);
      }
    }
  });
});

export default router;
