import { Pool } from "pg";
import { logger } from "./logger.js";

export const pool = new Pool({
  host: process.env.PG_HOST || "localhost",
  port: parseInt(process.env.PG_PORT || "5432", 10),
  database: process.env.PG_DATABASE || "repro_db",
  user: process.env.REVEAL_DB_USER || "app_user",
  password: process.env.REVEAL_DB_PASSWORD || "app_password",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected database pool error");
});
