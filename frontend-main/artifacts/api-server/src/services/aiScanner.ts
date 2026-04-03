/** Legacy hook: synchronous upload flow uses `runPiracyDetectionPipeline` instead. */
export async function scanContent(_file: { originalname: string; mimetype: string }): Promise<string[]> {
  return [];
}
