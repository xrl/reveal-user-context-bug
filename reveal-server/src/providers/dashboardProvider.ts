import type { IRVUserContext } from "reveal-sdk-node";
import { Readable } from "stream";
import JSZip from "jszip";
import { pool } from "../config/database.js";
import { logger } from "../config/logger.js";

export async function dashboardProvider(
  userContext: IRVUserContext | null,
  dashboardId: string
): Promise<Readable | null> {
  const orgId = userContext?.properties?.get("organizationId") || "0";

  const result = await pool.query(
    "SELECT content FROM reveal.dashboards WHERE id = $1 AND organization_id = $2",
    [dashboardId, orgId]
  );

  if (result.rows.length === 0) {
    logger.warn({ dashboardId, orgId }, "Dashboard not found");
    return null;
  }

  const content = result.rows[0].content;
  const zip = new JSZip();
  zip.file("Dashboard.json", JSON.stringify(content));
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return Readable.from(buffer);
}

export async function dashboardStorageProvider(
  userContext: IRVUserContext | null,
  dashboardId: string,
  stream: Readable
): Promise<void> {
  const orgId = userContext?.properties?.get("organizationId") || "0";

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  const zip = await JSZip.loadAsync(buffer);
  const dashboardJson = await zip.file("Dashboard.json")?.async("string");
  if (!dashboardJson) {
    throw new Error("Dashboard.json not found in rdash file");
  }

  const content = JSON.parse(dashboardJson);

  await pool.query(
    `INSERT INTO reveal.dashboards (id, name, content, organization_id, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (id) DO UPDATE SET content = $3, updated_at = now()`,
    [dashboardId, dashboardId, JSON.stringify(content), orgId]
  );

  logger.info({ dashboardId, orgId }, "Dashboard saved");
}
