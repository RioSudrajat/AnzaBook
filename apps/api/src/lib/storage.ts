import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { env } from "../config/env";
import { HttpError } from "./http-error";

export type ValidatedImageType = {
  mime: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
};

export interface StorageProvider {
  putObject(key: string, buffer: Buffer, contentType: string): Promise<string>;
  readObject(key: string): Promise<Buffer | null>;
  deleteObject(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}

/**
 * Validates real image binary magic bytes (JPEG, PNG, WebP) so spoofed MIME headers are rejected.
 */
export function detectValidatedImageType(
  buffer: Buffer,
): ValidatedImageType | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  return null;
}

function resolveSafeKeyPath(rootDir: string, key: string): string {
  const normalized = path.posix.normalize(key).replace(/^\/+/, "");
  if (!normalized || normalized.startsWith("..") || normalized.includes("\0")) {
    throw new HttpError(400, "INVALID_MEDIA_KEY", "Kunci media tidak valid.");
  }
  const resolved = path.resolve(rootDir, normalized);
  const rootResolved = path.resolve(rootDir);
  if (
    resolved !== rootResolved &&
    !resolved.startsWith(`${rootResolved}${path.sep}`)
  ) {
    throw new HttpError(400, "INVALID_MEDIA_KEY", "Kunci media tidak valid.");
  }
  return resolved;
}

export class LocalStorageProvider implements StorageProvider {
  private readonly rootDir: string;

  constructor(rootDir?: string) {
    this.rootDir =
      rootDir ??
      env.STORAGE_LOCAL_DIR ??
      (env.isTest
        ? path.join(os.tmpdir(), "anzabook-test-uploads")
        : path.resolve(process.cwd(), ".data/uploads"));
  }

  async putObject(key: string, buffer: Buffer): Promise<string> {
    const filePath = resolveSafeKeyPath(this.rootDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return key;
  }

  async readObject(key: string): Promise<Buffer | null> {
    try {
      const filePath = resolveSafeKeyPath(this.rootDir, key);
      return await fs.readFile(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const filePath = resolveSafeKeyPath(this.rootDir, key);
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  getPublicUrl(key: string): string {
    const base = env.BETTER_AUTH_URL.replace(/\/+$/, "");
    const cleanKey = key.replace(/^\/+/, "");
    return `${base}/api/media/${cleanKey}`;
  }
}

let cachedStorage: StorageProvider | null = null;

export function getStorageService(): StorageProvider {
  if (!cachedStorage) {
    // Future `s3` driver plugs in here without changing route/service callers.
    cachedStorage = new LocalStorageProvider();
  }
  return cachedStorage;
}

export async function storeValidatedImage(buffer: Buffer): Promise<{
  key: string;
  url: string;
  contentType: string;
  bytes: number;
}> {
  if (buffer.length === 0) {
    throw new HttpError(400, "EMPTY_FILE", "Berkas gambar tidak boleh kosong.");
  }
  if (buffer.length > 5 * 1024 * 1024) {
    throw new HttpError(413, "FILE_TOO_LARGE", "Ukuran gambar maksimal 5 MB.");
  }
  const detected = detectValidatedImageType(buffer);
  if (!detected) {
    throw new HttpError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Format gambar harus JPG, PNG, atau WebP yang valid.",
    );
  }

  const key = `images/${randomUUID()}.${detected.ext}`;
  const storage = getStorageService();
  await storage.putObject(key, buffer, detected.mime);

  return {
    key,
    url: storage.getPublicUrl(key),
    contentType: detected.mime,
    bytes: buffer.length,
  };
}
