import "server-only";
import { openSecretWith, sealSecretWith } from "../sealed-secret";

const KEY_ENV = "GITHUB_TOKEN_ENCRYPTION_KEY";

export function sealSecret(plain: string): string {
  return sealSecretWith(KEY_ENV, plain);
}

export function openSecret(sealed: string): string {
  return openSecretWith(KEY_ENV, sealed);
}
