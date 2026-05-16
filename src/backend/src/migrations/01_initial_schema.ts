import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // 0. Create a helper function for updated_at triggers
  await sql`
    CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `.execute(db);

  // 1. Users Table
  await db.schema
    .createTable("users")
    .ifNotExists()
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("username", "varchar(50)", (col) => col.unique().notNull())
    .addColumn("email", "varchar(255)", (col) => col.unique().notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .execute();

  // Add trigger to users table
  await sql`
    DROP TRIGGER IF EXISTS update_users_timestamp ON users;
  `.execute(db);

  await sql`
    CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
  `.execute(db);

  // 2. Passkeys Table
  await db.schema
    .createTable("passkeys")
    .ifNotExists()
    .addColumn("id", "varchar", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) =>
      col.references("users.id").onDelete("cascade").notNull(),
    )
    .addColumn("public_key", "bytea", (col) => col.notNull())
    .addColumn("counter", "bigint", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .execute();

  await db.schema
    .createIndex("idx_passkeys_user_id")
    .ifNotExists()
    .on("passkeys")
    .column("user_id")
    .execute();

  // 3. Aliases Table
  await db.schema
    .createTable("aliases")
    .ifNotExists()
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("user_id", "uuid", (col) =>
      col.references("users.id").onDelete("cascade").notNull(),
    )
    .addColumn("alias", "varchar(255)", (col) => col.notNull())
    .addColumn("is_active", "boolean", (col) => col.defaultTo(true).notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull(),
    )
    .addUniqueConstraint("unique_user_alias", ["user_id", "alias"])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("aliases").ifExists().execute();
  await db.schema.dropTable("passkeys").ifExists().execute();
  await db.schema.dropTable("users").ifExists().execute();
  await sql`DROP FUNCTION IF EXISTS update_timestamp() CASCADE`.execute(db);
}
