/**
 * Extract readable text from uploads (PDF, TXT, DOCX, images via OCR) for detection + previews.
 */

import { PDFParse } from "pdf-parse";

const MIN_MEANINGFUL_LEN = 50;
const MAX_STORED_FULL_TEXT = 400_000;
const SNIPPET_MAX = 1000;
const OCR_TIMEOUT_MS = 90_000;

const GENERIC_PATTERNS: RegExp[] = [
  /uploaded\s+via\s+contentguard/i,
  /contentguard\s+ipfs\s+integration/i,
  /ipfs\s+integration/i,
  /^contentguard\s+community/i,
];

export function isLowQualityExtract(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < MIN_MEANINGFUL_LEN) return true;
  for (const p of GENERIC_PATTERNS) {
    if (p.test(t)) return true;
  }
  return false;
}

/**
 * First 3–5 sentences, capped at SNIPPET_MAX; otherwise leading slice of body.
 */
export function buildSnippetFromFullText(fullText: string, maxLen = SNIPPET_MAX): string {
  const normalized = fullText.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const sentences = normalized.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  let acc = "";
  let count = 0;
  for (const s of sentences) {
    if (count >= 5) break;
    const next = acc ? `${acc} ${s}` : s;
    if (next.length > maxLen) return next.slice(0, maxLen);
    acc = next;
    count++;
  }
  if (acc.length > 0) return acc;
  return normalized.slice(0, maxLen);
}

async function ocrImageBuffer(buf: Buffer): Promise<{ text: string; error?: string }> {
  if (process.env.DISABLE_TESSERACT_OCR === "1") {
    return { text: "", error: "OCR disabled (DISABLE_TESSERACT_OCR)" };
  }
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    try {
      const recognizePromise = worker.recognize(buf);
      const timeoutPromise = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("OCR timeout")), OCR_TIMEOUT_MS),
      );
      const {
        data: { text },
      } = (await Promise.race([recognizePromise, timeoutPromise])) as { data: { text: string } };
      return { text: (text ?? "").replace(/\s+/g, " ").trim() };
    } finally {
      await worker.terminate().catch(() => undefined);
    }
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (/Cannot find module|tesseract/i.test(msg)) {
      console.warn(
        "[contentTextExtraction] OCR skipped: install optional dependency `tesseract.js` for image text extraction.",
      );
    }
    return { text: "", error: msg };
  }
}

export type TextExtractionSource = "pdf" | "text" | "docx" | "ocr" | "none";

/**
 * Raw extraction for async piracy pipeline (no quality gate).
 */
export async function extractFullTextForMime(
  buffer: Buffer,
  mimeType: string,
): Promise<{ fullText: string; source: TextExtractionSource }> {
  const m = mimeType.toLowerCase();
  try {
    if (m.includes("pdf")) {
      const parser = new PDFParse({ data: buffer });
      const r = await parser.getText();
      await parser.destroy().catch(() => undefined);
      return { fullText: (r.text ?? "").replace(/\s+/g, " ").trim(), source: "pdf" };
    }
    if (m.startsWith("text/")) {
      let s = buffer.toString("utf8");
      if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
      return { fullText: s.replace(/\s+/g, " ").trim(), source: "text" };
    }
    if (
      m === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      m.includes("wordprocessingml")
    ) {
      try {
        const { default: mammoth } = await import("mammoth");
        const r = await mammoth.extractRawText({ buffer });
        return { fullText: (r.value ?? "").replace(/\s+/g, " ").trim(), source: "docx" };
      } catch (e) {
        console.warn("[contentTextExtraction] DOCX (mammoth):", (e as Error)?.message ?? e);
        return { fullText: "", source: "none" };
      }
    }
    if (m.startsWith("image/jpeg") || m.startsWith("image/png") || m.startsWith("image/webp")) {
      const { text, error } = await ocrImageBuffer(buffer);
      if (error) console.warn("[contentTextExtraction] OCR:", error);
      return { fullText: text, source: "ocr" };
    }
  } catch (e) {
    console.warn("[contentTextExtraction] extractFullTextForMime:", (e as Error)?.message ?? e);
  }
  return { fullText: "", source: "none" };
}

export type PreparedUploadText = {
  fullText: string | null;
  textSnippet: string | null;
  rejected: boolean;
  rejectionReason?: string;
};

export async function prepareTextForContentRow(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<PreparedUploadText> {
  const { fullText: rawFull, source } = await extractFullTextForMime(buffer, mimeType);
  const snippet = rawFull ? buildSnippetFromFullText(rawFull) : "";

  console.log("Extracted text:", snippet || rawFull || "(empty)");

  if (!rawFull || isLowQualityExtract(rawFull)) {
    const reason = !rawFull
      ? source === "none"
        ? "no text extractor or empty extraction for this file type"
        : "extracted text empty"
      : "text too short or generic placeholder-like";
    console.warn(`[contentTextExtraction] reject upload "${fileName}": ${reason}`);
    return { fullText: null, textSnippet: null, rejected: true, rejectionReason: reason };
  }

  const fullStored = rawFull.length > MAX_STORED_FULL_TEXT ? rawFull.slice(0, MAX_STORED_FULL_TEXT) : rawFull;
  const textSnippet = snippet.length >= MIN_MEANINGFUL_LEN ? snippet : fullStored.slice(0, SNIPPET_MAX);

  return {
    fullText: fullStored,
    textSnippet,
    rejected: false,
  };
}
