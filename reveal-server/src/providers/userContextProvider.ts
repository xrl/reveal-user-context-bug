import { createRequire } from "module";
import type { RVUserContext as RVUserContextType } from "reveal-sdk-node";
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { logger } from "../config/logger.js";
import { loadJwtConfig } from "../config/jwt.js";

const require = createRequire(import.meta.url);
const { RVUserContext } = require("reveal-sdk-node");

const jwtConfig = loadJwtConfig();

interface RevealJwtPayload {
  sub: string;
  org_id: number;
  iat: number;
  exp: number;
  iss: string;
}

export function userContextProvider(request: IncomingMessage): RVUserContextType {
  const properties = new Map<string, any>();

  // Try x-reveal-* headers first (set by Express middleware bridge)
  const headerUserId = request.headers["x-reveal-userid"] as string | undefined;
  const headerOrgId = request.headers["x-reveal-organizationid"] as string | undefined;
  if (headerUserId && headerOrgId) {
    properties.set("organizationId", headerOrgId);
    logger.debug({ userId: headerUserId, organizationId: headerOrgId }, "User context from headers");
    return new RVUserContext(headerUserId, properties);
  }

  // Fallback: parse JWT from Authorization header
  const authHeader = request.headers["authorization"] as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn("No user context headers or Bearer token");
    properties.set("organizationId", "0");
    return new RVUserContext("anonymous", properties);
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, jwtConfig.publicKey, {
      algorithms: ["RS256"],
      issuer: "repro-app",
    }) as RevealJwtPayload;

    properties.set("organizationId", String(payload.org_id));
    logger.debug({ userId: payload.sub, organizationId: payload.org_id }, "User context from JWT");
    return new RVUserContext(payload.sub, properties);
  } catch (error) {
    logger.error({ err: error }, "Failed to verify JWT in userContextProvider");
    properties.set("organizationId", "0");
    return new RVUserContext("anonymous", properties);
  }
}
