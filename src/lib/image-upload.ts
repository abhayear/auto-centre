import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

export const UPLOAD_CATEGORIES = ["vehicles", "site", "services", "customers"] as const;
export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isUploadCategory(value: string): value is UploadCategory {
  return UPLOAD_CATEGORIES.includes(value as UploadCategory);
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Only JPEG, PNG, WebP, and GIF images are allowed.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Each image must be 5 MB or smaller.";
  }
  return null;
}

function extensionFor(file: File): string {
  return EXT_BY_TYPE[file.type] ?? "jpg";
}

async function saveLocalImage(file: File, category: UploadCategory): Promise<string> {
  const ext = extensionFor(file);
  const filename = `${randomUUID()}.${ext}`;
  const relativePath = path.join("uploads", category, filename);
  const absoluteDir = path.join(process.cwd(), "public", "uploads", category);
  await mkdir(absoluteDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(absoluteDir, filename), buffer);
  return `/${relativePath.replace(/\\/g, "/")}`;
}

async function saveBlobImage(file: File, category: UploadCategory): Promise<string> {
  const ext = extensionFor(file);
  const filename = `${category}/${randomUUID()}.${ext}`;
  const blob = await put(filename, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });
  return blob.url;
}

export async function saveUploadedImage(
  file: File,
  category: UploadCategory = "vehicles",
): Promise<string> {
  const error = validateImageFile(file);
  if (error) {
    throw new Error(error);
  }

  if (!isUploadCategory(category)) {
    throw new Error("Invalid upload category.");
  }

  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "Production uploads need BLOB_READ_WRITE_TOKEN in Vercel environment variables.",
    );
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return saveBlobImage(file, category);
  }

  return saveLocalImage(file, category);
}

export function isAllowedUploadedImage(value: string): boolean {
  if (value.startsWith("/uploads/")) {
    return value.length <= 2048;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** @deprecated use isAllowedUploadedImage */
export function isAllowedVehicleImage(value: string): boolean {
  return isAllowedUploadedImage(value);
}
