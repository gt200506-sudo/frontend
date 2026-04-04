declare module "tesseract.js" {
  export type RecognizeResult = { data: { text: string } };
  export type Worker = {
    recognize(image: Buffer | Uint8Array): Promise<RecognizeResult>;
    terminate(): Promise<void>;
  };
  export function createWorker(languages?: string, oem?: number, options?: { logger?: (m: unknown) => void }): Promise<Worker>;
}
