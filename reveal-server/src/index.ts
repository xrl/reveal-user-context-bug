import { createApp } from "./app.js";
import { logger } from "./config/logger.js";

const port = parseInt(process.env.PORT || "5111", 10);

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
