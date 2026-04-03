type ScanResult = string;

function pickMockMatches(fileName: string, mimeType: string): string[] {
  const normalizedName = fileName.toLowerCase();
  if (mimeType.startsWith("image/")) {
    return [
      `https://images.example.com/similar/${encodeURIComponent(normalizedName)}`,
      "https://stock.example.net/match/visual-fingerprint",
    ];
  }

  if (mimeType === "application/pdf" || mimeType.includes("wordprocessingml")) {
    return [
      "https://docs.example.org/repost/section-3",
      `https://archive.example.com/cached/${encodeURIComponent(normalizedName)}`,
    ];
  }

  return ["https://text.example.io/possible-copy", "https://blog.example.dev/paraphrase-match"];
}

export async function scanContent(file: { originalname: string; mimetype: string }): Promise<ScanResult[]> {
  // Placeholder logic only; no fake latency.
  return pickMockMatches(file.originalname, file.mimetype);
}
