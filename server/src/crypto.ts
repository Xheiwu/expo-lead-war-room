import crypto from "node:crypto";

function getKey() {
  const secret = process.env.APP_SECRET || "dev-app-secret-change-me-please";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptText(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptText(payload: string) {
  const [ivRaw, tagRaw, encryptedRaw] = payload.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final()
  ]).toString("utf8");
}

export function randomToken() {
  return crypto.randomBytes(24).toString("base64url");
}
