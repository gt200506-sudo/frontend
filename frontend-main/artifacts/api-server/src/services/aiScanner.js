function pickMockMatches(fileName, mimeType) {
  const normalizedName = String(fileName || "").toLowerCase();
  if (String(mimeType || "").startsWith("image/")) {
    return [
      `https://images.example.com/similar/${encodeURIComponent(normalizedName)}`,
      "https://stock.example.net/match/visual-fingerprint",
    ];
  }

  if (mimeType === "application/pdf" || String(mimeType || "").includes("wordprocessingml")) {
    return [
      "https://docs.example.org/repost/section-3",
      `https://archive.example.com/cached/${encodeURIComponent(normalizedName)}`,
    ];
  }

  return ["https://text.example.io/possible-copy", "https://blog.example.dev/paraphrase-match"];
}

export async function scanContent(file) {
  return pickMockMatches(file?.originalname, file?.mimetype);
}
