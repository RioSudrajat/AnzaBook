import express, { Router } from "express";
import { HttpError } from "../lib/http-error";
import { getStorageService, storeValidatedImage } from "../lib/storage";
import { requireAuth } from "../middleware/auth";
import { requireTrustedOrigin } from "../middleware/origin";

const SAFE_IMAGE_FILENAME_REGEX = /^[0-9a-f-]{36}\.(jpg|png|webp)$/i;

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const mediaRouter = Router();

mediaRouter.post(
  "/upload-image",
  requireAuth,
  requireTrustedOrigin,
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp", "application/octet-stream"],
    limit: "5mb",
  }),
  async (req, res) => {
    const rawBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const stored = await storeValidatedImage(rawBuffer);
    res.status(201).json({ data: stored });
  },
);

mediaRouter.get("/images/:filename", async (req, res) => {
  const filename = String(req.params.filename || "");
  if (!SAFE_IMAGE_FILENAME_REGEX.test(filename)) {
    throw new HttpError(404, "NOT_FOUND", "Berkas tidak ditemukan.");
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "png";
  const mime = EXT_TO_MIME[ext] ?? "application/octet-stream";
  const buffer = await getStorageService().readObject(`images/${filename}`);
  if (!buffer) {
    throw new HttpError(404, "NOT_FOUND", "Berkas tidak ditemukan.");
  }

  res.setHeader("Content-Type", mime);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(buffer);
});
