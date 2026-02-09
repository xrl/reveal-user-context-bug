import { createRequire } from "module";
import type { RevealOptions, RevealRequestListener } from "reveal-sdk-node";

import { userContextProvider } from "../providers/userContextProvider.js";
import { dataSourceProvider, dataSourceItemProvider } from "../providers/dataSourceProvider.js";
import { authenticationProvider } from "../providers/authProvider.js";
import { dashboardProvider, dashboardStorageProvider } from "../providers/dashboardProvider.js";

const require = createRequire(import.meta.url);
const reveal = require("reveal-sdk-node") as (options?: RevealOptions) => RevealRequestListener;

export function createRevealMiddleware(): RevealRequestListener {
  const revealOptions: RevealOptions = {
    license: process.env.REVEAL_LICENSE || undefined,
    localFileStoragePath: "data",
    userContextProvider,
    dataSourceProvider,
    dataSourceItemProvider,
    authenticationProvider,
    dashboardProvider,
    dashboardStorageProvider,
    engineLogLevel: "Trace",
    engineLogDir: "/tmp/reveal-logs",
  };

  return reveal(revealOptions);
}
