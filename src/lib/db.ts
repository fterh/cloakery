import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";

interface UserTable {
  id: string; // UUID
  email: string;
  username: string;
  created_at: Date;
  updated_at: Date;
}

interface PasskeyTable {
  id: string; // The WebAuthn credential ID
  user_id: string;
  public_key: Buffer;
  counter: number;
  created_at: Date;
}

interface AliasTable {
  id: string; // Internal UUID
  user_id: string; // FKey to users.id
  alias: string; // e.g. "shopping"
  is_active: boolean;
  created_at: Date;
}

export interface Database {
  users: UserTable;
  passkeys: PasskeyTable;
  aliases: AliasTable;
}

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  }),
});

export const db = new Kysely<Database>({
  dialect,
});

export const userExists = async (
  email: string,
  username: string,
): Promise<boolean> => {
  const user = await db
    .selectFrom("users")
    .select("id")
    .where((eb) =>
      eb.or([eb("email", "=", email), eb("username", "=", username)]),
    )
    .executeTakeFirst();
  return !!user;
};
