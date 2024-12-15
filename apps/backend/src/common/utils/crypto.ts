import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

export const getEncryptionKey = (rawKey: string) => {
  if (!rawKey || rawKey.length < 32) {
    throw new Error("MESSAGE_ENCRYPTION_KEY must be at least 32 characters");
  }
  return crypto.createHash("sha256").update(rawKey).digest();
};

export const encryptText = (plainText: string, key: Buffer) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
};

export const decryptText = (payload: string, key: Buffer) => {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return payload;
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return payload;
  }
};
