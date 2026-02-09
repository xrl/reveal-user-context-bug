import { createApp } from "./app.js";
import { logger } from "./config/logger.js";

const port = parseInt(process.env.PORT || "5111", 10);

const envKeys = [
  "PORT",
  "NODE_ENV",
  "PG_HOST",
  "PG_PORT",
  "PG_DATABASE",
  "REVEAL_DB_USER",
  "REVEAL_DB_PASSWORD",
  "REVEAL_LICENSE",
] as const;

logger.info("Environment configuration:");
for (const key of envKeys) {
  const val = process.env[key];
  if (key === "REVEAL_LICENSE") {
    logger.info({ key, length: val?.length ?? 0 }, `  ${key} = <${val ? `${val.length} chars` : "not set"}>`);
  } else {
    logger.info({ key, value: val ?? "(not set)" }, `  ${key} = ${val ?? "(not set)"}`);
  }
}

const { app } = createApp();

const server = app.listen(port, () => {
  logger.info({ port }, "Reveal repro server started");
});

const shutdown = (signal: string) => {
  logger.info({ signal }, "Shutdown signal received");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
