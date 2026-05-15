import type { Migration, MigrationProvider } from "kysely";
import * as initialSchema from "./01_initial_schema.js";

export const migrations: Record<string, Migration> = {
  "01_initial_schema": initialSchema,
};

export class ObjectMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return migrations;
  }
}
