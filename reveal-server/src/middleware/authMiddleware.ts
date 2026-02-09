import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { loadJwtConfig } from "../config/jwt.js";
import { logger } from "../config/logger.js";

const jwtConfig = loadJwtConfig();

interface RevealJwtPayload {
  sub: string;
  org_id: number;
  iat: number;
  exp: number;
  iss: string;
}

declare global {
  namespace Express {
    interface Request {
      userContext?: {
        userId: string;
        organizationId: number;
      };
    }
  }
}

export function verifyJwt(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, jwtConfig.publicKey, {
      algorithms: ["RS256"],
      issuer: "repro-app",
    }) as RevealJwtPayload;

    req.userContext = {
      userId: payload.sub,
      organizationId: payload.org_id,
    };
    next();
  } catch (error) {
    logger.warn({ err: error }, "JWT verification failed");
    res.status(401).json({ error: "Invalid token" });
  }
}
