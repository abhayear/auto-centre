import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function encryptionKey(): Buffer {
  const secret =
    process.env.INVENTORY_PORTAL_SECRET ||
    process.env.AUTH_SECRET ||
    "dev-inventory-portal";
  return createHash("sha256").update(secret).digest();
}

export function encryptPortalPassword(plain: string): string {
  if (!plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptPortalPassword(stored: string): string {
  if (!stored) return "";
  const parts = stored.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid stored portal password");
  }
  const [ivB64, tagB64, cipherB64] = parts;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
