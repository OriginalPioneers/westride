import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

function key(keyEnv: string): Buffer {
  const raw = process.env[keyEnv]?.trim() ?? "";
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length !== 32) {
    throw new Error(`${keyEnv} must be 32 random bytes, base64-encoded.`);
  }
  return bytes;
}

export function hasSealingKey(keyEnv: string): boolean {
  return Buffer.from(process.env[keyEnv]?.trim() ?? "", "base64").length === 32;
}

/** AES-256-GCM. The output is safe to store and useless without the key. */
export function sealSecretWith(keyEnv: string, plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(keyEnv), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, body]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

export function openSecretWith(keyEnv: string, sealed: string): string {
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== VERSION || !iv || !tag || body === undefined) {
    throw new Error("Unrecognized sealed secret.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(keyEnv),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(body, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
