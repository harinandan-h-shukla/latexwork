import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// AES-256-GCM encryption for file content at rest (ProjectFile.content in
// MongoDB). The key is derived once from FILE_ENCRYPTION_KEY via scrypt
// (so the env var itself doesn't need to be exactly 32 bytes) and cached —
// this module is only ever imported from server-only code (Mongoose model
// getters/setters), never sent to the client.
//
// Stored format: `v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>` — versioned so
// a future key-rotation or algorithm change can tell old rows apart from
// new ones instead of guessing.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM
const VERSION_PREFIX = "v1";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.FILE_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "FILE_ENCRYPTION_KEY is not set. Add it to .env.local (see .env.local for the local dev value)."
    );
  }
  // scrypt with a fixed, non-secret salt derived from the algorithm name —
  // the secret itself is what provides the entropy; the salt here only
  // exists to satisfy scrypt's API, not to add security beyond the key.
  cachedKey = scryptSync(secret, "inkwell-file-encryption-v1", 32);
  return cachedKey;
}

/** Encrypts plaintext file content for storage. Returns the same string
 * unchanged if given an empty string (nothing meaningful to protect, and
 * keeps `sizeBytes: content.length` call sites accurate for empty files). */
export function encryptFileContent(plaintext: string): string {
  if (plaintext === "") return "";
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${VERSION_PREFIX}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Thrown by decryptFileContent when a `v1:`-prefixed value can't be
 * authenticated with the current key — a wrong/rotated key or a corrupted
 * row. Distinct from a legitimately-empty/unencrypted value, which
 * decryptFileContent returns normally. */
export class FileDecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileDecryptionError";
  }
}

/** Decrypts content produced by encryptFileContent. Passes through
 * unrecognized (non-`v1:`-prefixed) values unchanged rather than throwing —
 * covers empty strings and any content written before encryption existed,
 * instead of corrupting or crashing on it. Throws FileDecryptionError (does
 * NOT swallow to "") when a `v1:`-prefixed value fails GCM authentication —
 * silently returning "" here previously made a corrupted-or-wrong-key row
 * indistinguishable from a genuinely empty file to every caller, including
 * the compile file-gatherer and the save path, so a bad row could get
 * silently compiled as blank and then permanently overwrite any
 * still-recoverable on-disk copy. Real incident: three projects' files
 * were re-encrypted with a stale key during an earlier recovery pass and
 * came back "empty" everywhere, with no error anywhere, until this was
 * traced by hand. See lib/db/models/project.ts's schema getter for how
 * bulk/listing reads still degrade gracefully instead of throwing. */
export function decryptFileContent(stored: string): string {
  if (!stored.startsWith(`${VERSION_PREFIX}:`)) return stored;
  const parts = stored.split(":");
  if (parts.length !== 4) return stored;
  const [, ivHex, authTagHex, cipherHex] = parts;
  try {
    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherHex, "hex")), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    throw new FileDecryptionError(
      "File content could not be decrypted — the stored row is corrupted or was encrypted with a different key."
    );
  }
}
