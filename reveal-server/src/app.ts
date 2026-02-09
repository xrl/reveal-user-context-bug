import os from "os";
import express from "express";
import cors from "cors";
import type { RevealRequestListener } from "reveal-sdk-node";

import { logger } from "./config/logger.js";
import { pool } from "./config/database.js";
import { verifyJwt } from "./middleware/authMiddleware.js";
import { createRevealMiddleware } from "./config/reveal.js";

export interface AppWithReveal {
  app: express.Express;
  revealMiddleware: RevealRequestListener;
}

export function createApp(): AppWithReveal {
  const app = express();

  // CORS - allow frontend
  app.use(cors({ origin: true, credentials: true }));

  // Health check (no auth)
  app.get("/health", async (_req, res) => {
    try {
      const result = await pool.query("SELECT NOW() as time");
      res.json({
        status: "healthy",
        platform: { os: os.platform(), arch: os.arch(), nodeVersion: process.version },
        database: { connected: true, time: result.rows[0].time },
      });
    } catch (error) {
      res.status(503).json({ status: "unhealthy", database: { connected: false } });
    }
  });

  // JWT auth for everything else
  app.use((req, res, next) => {
    if (req.path === "/health") return next();
    return verifyJwt(req, res, next);
  });

  // List dashboards
  app.get("/dashboards", async (req, res) => {
    const orgId = req.userContext?.organizationId || 0;
    const result = await pool.query(
      "SELECT id, name, created_at, updated_at FROM reveal.dashboards WHERE organization_id = $1 ORDER BY updated_at DESC",
      [orgId]
    );
    res.json(result.rows);
  });

  // Bridge user context into headers for the Reveal .NET engine
  app.use((req, _res, next) => {
    if (req.userContext) {
      req.headers["x-reveal-userid"] = req.userContext.userId;
      req.headers["x-reveal-organizationid"] = String(req.userContext.organizationId);
    }
    next();
  });

  const revealMiddleware = createRevealMiddleware();
  app.use("/", revealMiddleware);

  return { app, revealMiddleware };
}
