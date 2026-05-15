import type { APIGatewayProxyResultV2 } from "aws-lambda";
import { Migrator } from "kysely";
import { ObjectMigrationProvider } from "../migrations/index.js";
import { db } from "./db.js";

export const handler = async (): Promise<APIGatewayProxyResultV2> => {
  const migrator = new Migrator({
    db,
    provider: new ObjectMigrationProvider(),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("failed to migrate");
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Migration failed",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Migrations completed successfully",
      results,
    }),
  };
};
