import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

import sharpPHash from "sharp-phash";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { PDFParse } from "pdf-parse";

// Keep this aligned with sharp-phash default phash output length (commonly 64 bits).
const P_HASH_BIT_LENGTH_FALLBACK = 64;

function normalizeSha256Hash(hash: string): string {
  const trimmed = hash.trim().toLowerCase();
  return trimmed.startsWith("sha256:") ? trimmed.slice("sha256:".length) : trimmed;
}

export async function sha256Hex(buffer: Buffer): Promise<string> {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function perceptualHashImage(buffer: Buffer): Promise<string> {
  // sharp-phash resolves to a binary string (e.g. "0101...") representing the image.
  const hash = await sharpPHash(buffer);
  if (typeof hash !== "string" || !hash.length) throw new Error("Failed to compute perceptual hash");
  return hash;
}

function guessVideoExtension(mimetype: string | undefined, originalName?: string): string {
  const fromName = originalName?.includes(".") ? path.extname(originalName) : "";
  if (fromName) return fromName;

  const m = (mimetype ?? "").toLowerCase();
  if (m.includes("webm")) return ".webm";
  if (m.includes("quicktime") || m.includes("mov")) return ".mov";
  if (m.includes("mpeg")) return ".mpg";
  return ".mp4";
}

async function extractFirstVideoFrame(buffer: Buffer, mimetype: string | undefined, originalName?: string): Promise<Buffer> {
  if (!ffmpegStatic) throw new Error("ffmpeg-static binary not available");

  // fluent-ffmpeg works reliably with file paths, so we write to a temp file.
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "contentguard-piracy-"));
  const inputExt = guessVideoExtension(mimetype, originalName);
  const inputPath = path.join(tmpDir, `input${inputExt}`);
  const outputPath = path.join(tmpDir, "frame.png");

  try {
    await fs.writeFile(inputPath, buffer);

    ffmpeg.setFfmpegPath(ffmpegStatic as any);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        // Use 0s to grab the first meaningful frame.
        .seekInput(0)
        .outputOptions(["-frames:v 1", "-f image2", "-vcodec png"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: unknown) => reject(err))
        .run();
    });

    return await fs.readFile(outputPath);
  } finally {
    // Best-effort cleanup.
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function perceptualHashVideo(buffer: Buffer, mimetype: string | undefined, originalName?: string): Promise<string> {
  const frameBuffer = await extractFirstVideoFrame(buffer, mimetype, originalName);
  return perceptualHashImage(frameBuffer);
}

function normalizeTextForFingerprint(text: string): string {
  // Collapse whitespace and remove most punctuation to stabilize shingles.
  return text
    .toLowerCase()
    .replace(/[\u2019']/g, "") // remove apostrophes
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprintFromTokenShingles(tokens: string[], opts?: { shingleSize?: number; maxShingles?: number }): string[] {
  const shingleSize = opts?.shingleSize ?? 6; // tokens in a phrase window
  const maxShingles = opts?.maxShingles ?? 700;

  const shingles: string[] = [];
  for (let i = 0; i + shingleSize <= tokens.length && shingles.length < maxShingles; i++) {
    const shingle = tokens.slice(i, i + shingleSize).join(" ");
    // Store only a compact hash per shingle for a stable set representation.
    const h = createHash("sha256").update(shingle).digest("hex").slice(0, 16);
    shingles.push(h);
  }
  return Array.from(new Set(shingles)).sort();
}

export async function textFingerprintPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  // pdf-parse may hold resources; destroy is best-effort.
  await parser.destroy().catch(() => undefined);

  const normalized = normalizeTextForFingerprint(result.text ?? "");
  if (!normalized) return JSON.stringify([]);

  const tokens = normalized.split(" ").filter(Boolean);
  const fingerprint = fingerprintFromTokenShingles(tokens);
  return JSON.stringify(fingerprint);
}

export function hammingSimilarity(bitStringA: string, bitStringB: string): number | null {
  const a = bitStringA.trim();
  const b = bitStringB.trim();
  if (!a.length || !b.length) return null;

  if (a.length !== b.length) {
    // sharp-phash typically outputs fixed length; if mismatched, we can't compare reliably.
    return null;
  }

  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++;
  }

  const len = a.length || P_HASH_BIT_LENGTH_FALLBACK;
  return Math.max(0, 1 - dist / len);
}

export function jaccardSimilarityFromJsonSet(jsonSetA: string | null | undefined, jsonSetB: string | null | undefined): number | null {
  if (!jsonSetA || !jsonSetB) return null;

  let setA: Set<string>;
  let setB: Set<string>;
  try {
    const parsedA = JSON.parse(jsonSetA);
    const parsedB = JSON.parse(jsonSetB);
    if (!Array.isArray(parsedA) || !Array.isArray(parsedB)) return null;
    setA = new Set(parsedA.map(String));
    setB = new Set(parsedB.map(String));
  } catch {
    return null;
  }

  if (setA.size === 0 || setB.size === 0) return null;

  let intersection = 0;
  for (const v of setA) {
    if (setB.has(v)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  if (union === 0) return null;
  return intersection / union;
}

export function sha256ExactMatch(incomingHexOrPrefixed: string, storedContentHash: string | null | undefined): boolean {
  if (!storedContentHash) return false;
  const inc = normalizeSha256Hash(incomingHexOrPrefixed);
  const stored = normalizeSha256Hash(storedContentHash);
  return inc === stored;
}

