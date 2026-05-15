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
    ssl: {
      rejectUnauthorized: false, // Required for RDS unless you bundle the AWS CA cert
    },
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

export const createUserWithPasskey = async (params: {
  userId: string;
  email: string;
  username: string;
  passkey: {
    id: string;
    publicKey: Buffer;
    counter: number;
  };
}) => {
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto("users")
      .values({
        id: params.userId,
        email: params.email,
        username: params.username,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    await trx
      .insertInto("passkeys")
      .values({
        id: params.passkey.id,
        user_id: params.userId,
        public_key: params.passkey.publicKey,
        counter: params.passkey.counter,
        created_at: new Date(),
      })
      .execute();
  });
};
