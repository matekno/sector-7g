import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

export function getUploadsDir(): string {
  return path.resolve(process.cwd(), UPLOAD_DIR);
}

export function getFilePath(filename: string): string {
  // Security: only use the basename to prevent path traversal
  const safeName = path.basename(filename);
  return path.join(getUploadsDir(), safeName);
}

export async function ensureUploadsDir(): Promise<void> {
  const dir = getUploadsDir();
  await fs.mkdir(dir, { recursive: true });
}

export async function saveFile(filename: string, buffer: Buffer): Promise<string> {
  await ensureUploadsDir();
  const filePath = getFilePath(filename);
  await fs.writeFile(filePath, buffer);
  return filename; // return only the filename, not the full path
}

export async function readFile(filename: string): Promise<Buffer> {
  const filePath = getFilePath(filename);
  return fs.readFile(filePath);
}

export async function deleteFile(filename: string): Promise<void> {
  const filePath = getFilePath(filename);
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    // If file doesn't exist on disk, just ignore
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}
