import fs from "fs";
import crypto from "crypto";
import { logger } from "./logger.js";

export interface JwtConfig {
  publicKey: string;
}

export function loadJwtConfig(): JwtConfig {
  let publicKey: string | undefined;

  if (process.env.REVEAL_BI_JWT_PUBLIC_KEY) {
    publicKey = process.env.REVEAL_BI_JWT_PUBLIC_KEY;
  } else {
    // Look for the key file at known paths
    for (const keyPath of ["/app/jwt-public.pem", "jwt-public.pem"]) {
      if (fs.existsSync(keyPath)) {
        publicKey = fs.readFileSync(keyPath, "utf8");
        break;
      }
    }
  }

  if (!publicKey) {
    logger.error("JWT public key not configured. Set REVEAL_BI_JWT_PUBLIC_KEY or mount /app/jwt-public.pem");
    process.exit(1);
  }

  // Hash just the base64 key material (strip PEM headers/whitespace) for a stable fingerprint
  const keyBody = publicKey.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const fingerprint = crypto
    .createHash("sha256")
    .update(keyBody)
    .digest("hex")
    .slice(0, 16);
  logger.info({ fingerprint }, `JWT public key loaded (fingerprint: ${fingerprint})`);
  return { publicKey };
}
