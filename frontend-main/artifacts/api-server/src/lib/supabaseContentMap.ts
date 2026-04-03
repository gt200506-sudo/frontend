/** Map Supabase `public.content` row → API Content list item shape. */
export function inferContentType(fileType: string): string {
  if (!fileType) return "document";
  if (fileType.startsWith("image/")) return "image";
  if (fileType.startsWith("video/")) return "video";
  if (fileType.startsWith("text/")) return "document";
  if (["paper", "course", "image", "document", "text", "video"].includes(fileType)) return fileType;
  return "document";
}

export function mapSupabaseContentRow(c: Record<string, unknown>) {
  const fileType = String(c.file_type ?? "");
  const created = c.created_at;
  const registeredAt =
    typeof created === "string"
      ? created
      : created instanceof Date
        ? created.toISOString()
        : new Date(String(created)).toISOString();

  return {
    id: String(c.id),
    title: String(c.file_name ?? ""),
    type: inferContentType(fileType),
    description: undefined,
    contentHash: String(c.content_hash ?? c.ipfs_hash ?? ""),
    fileSize: undefined,
    author: "Unknown Author",
    organization: "ContentGuard Community",
    registeredAt,
    blockchainTxHash: null,
    ipfsHash: (c.ipfs_hash as string | null) ?? null,
    detectionCount: 0,
    status: "active" as const,
    similarityThreshold: 0.85,
    excerpt: undefined,
    aiAnalysis: null,
  };
}
