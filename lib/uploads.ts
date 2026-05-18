import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

export async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function writeUpload(buffer: Buffer, ext: string): Promise<string> {
  await ensureUploadsDir();
  const name = `${crypto.randomUUID()}.${ext.replace(/^\./, "")}`;
  const full = path.join(UPLOADS_DIR, name);
  await fs.writeFile(full, buffer);
  return name;
}

export function uploadPath(name: string): string {
  return path.join(UPLOADS_DIR, path.basename(name));
}
