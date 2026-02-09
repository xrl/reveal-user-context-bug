import { createRequire } from "module";
import type {
  IRVUserContext,
  RVDashboardDataSource,
  RVDataSourceItem,
} from "reveal-sdk-node";

const require = createRequire(import.meta.url);
const { RVPostgresDataSource, RVPostgresDataSourceItem } = require("reveal-sdk-node");

export async function dataSourceProvider(
  _userContext: IRVUserContext | null,
  dataSource: RVDashboardDataSource
): Promise<RVDashboardDataSource | null> {
  if (dataSource instanceof RVPostgresDataSource) {
    const ds = dataSource as any;
    ds.host = process.env.PG_HOST || "postgres";
    ds.port = parseInt(process.env.PG_PORT || "5432", 10);
    ds.database = process.env.PG_DATABASE || "repro_db";
    ds.schema = "public";
  }
  return dataSource;
}

export async function dataSourceItemProvider(
  _userContext: IRVUserContext | null,
  dataSourceItem: RVDataSourceItem
): Promise<RVDataSourceItem | null> {
  if (dataSourceItem instanceof RVPostgresDataSourceItem) {
    const ds = (dataSourceItem as any).dataSource;
    if (ds) {
      ds.host = process.env.PG_HOST || "postgres";
      ds.port = parseInt(process.env.PG_PORT || "5432", 10);
      ds.database = process.env.PG_DATABASE || "repro_db";
      ds.schema = "public";
    }
  }
  return dataSourceItem;
}
