import fs from "fs";
import { logger } from "./logger.js";

export interface JwtConfig {
  publicKey: string;
}

export function loadJwtConfig(): JwtConfig {
  let publicKey: string | undefined;

  if (process.env.REVEAL_BI_JWT_PUBLIC_KEY) {
    publicKey = process.env.REVEAL_BI_JWT_PUBLIC_KEY;
  } else {
    // Look for the key file at a default path
    const keyPath = "/app/jwt-public.pem";
    if (fs.existsSync(keyPath)) {
      publicKey = fs.readFileSync(keyPath, "utf8");
    }
  }

  if (!publicKey) {
    logger.error("JWT public key not configured. Set REVEAL_BI_JWT_PUBLIC_KEY or mount /app/jwt-public.pem");
    process.exit(1);
  }

  logger.info("JWT public key loaded");
  return { publicKey };
}
