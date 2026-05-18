// Demo stub: no real filesystem uploads.

export const UPLOADS_DIR = "/tmp/lifeos-demo-uploads";

export async function ensureUploadsDir(): Promise<void> {
  // no-op
}

export async function writeUpload(
  _buffer: Buffer,
  _ext: string,
): Promise<string> {
  return "demo.bin";
}

export function uploadPath(name: string): string {
  return `${UPLOADS_DIR}/${name}`;
}
