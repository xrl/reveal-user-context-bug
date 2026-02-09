import { createRequire } from "module";
import type { IRVUserContext, RVDashboardDataSource } from "reveal-sdk-node";

const require = createRequire(import.meta.url);
const { RVUsernamePasswordDataSourceCredential } = require("reveal-sdk-node");

export async function authenticationProvider(
  _userContext: IRVUserContext | null,
  _dataSource: RVDashboardDataSource
) {
  return new RVUsernamePasswordDataSourceCredential(
    process.env.REVEAL_DB_USER || "app_user",
    process.env.REVEAL_DB_PASSWORD || "app_password"
  );
}
