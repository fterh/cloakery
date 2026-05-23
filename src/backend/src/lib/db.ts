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
  description: string | null;
  is_active: boolean;
  created_at: Date;
}

// Handle BigInts (Postgres INT8) as numbers to avoid string conversion issues with counters.
pg.types.setTypeParser(pg.types.builtins.INT8, (value: string) =>
  parseInt(value, 10),
);

export interface Database {
  users: UserTable;
  passkeys: PasskeyTable;
  aliases: AliasTable;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1, // Optimize for Lambda: one connection per instance
});

// Error handling for the pool to prevent process crashes
pool.on("error", (err) => {
  console.error("Unexpected error on idle database client", err);
});

const dialect = new PostgresDialect({
  pool,
});

export const db = new Kysely<Database>({
  dialect,
});

// --- Auth Helpers ---

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

export const getUserById = async (
  id: string,
): Promise<{ id: string; email: string; username: string } | null> => {
  const user = await db
    .selectFrom("users")
    .select(["id", "email", "username"])
    .where("id", "=", id)
    .executeTakeFirst();
  return user || null;
};

export const getUserWithPasskeys = async (
  username: string,
): Promise<{
  id: string;
  email: string;
  passkeys: { id: string }[];
} | null> => {
  const user = await db
    .selectFrom("users")
    .select(["id", "email"])
    .where("username", "=", username)
    .executeTakeFirst();

  if (!user) return null;

  const passkeys = await db
    .selectFrom("passkeys")
    .select("id")
    .where("user_id", "=", user.id)
    .execute();

  return { ...user, passkeys };
};

export const getPasskey = async (
  credentialId: string,
): Promise<{
  id: string;
  user_id: string;
  public_key: Buffer;
  counter: number;
} | null> => {
  const passkey = await db
    .selectFrom("passkeys")
    .select(["id", "user_id", "public_key", "counter"])
    .where("id", "=", credentialId)
    .executeTakeFirst();
  return passkey || null;
};

export const updatePasskeyCounter = async (
  credentialId: string,
  counter: number,
) => {
  await db
    .updateTable("passkeys")
    .set({ counter })
    .where("id", "=", credentialId)
    .execute();
};

// --- Alias Helpers ---

export const getAliasesByUserId = async (userId: string) => {
  return await db
    .selectFrom("aliases")
    .selectAll()
    .where("user_id", "=", userId)
    .orderBy("created_at", "desc")
    .execute();
};

export const createAlias = async (params: {
  userId: string;
  alias: string;
  description?: string;
}) => {
  const id = crypto.randomUUID();
  await db
    .insertInto("aliases")
    .values({
      id,
      user_id: params.userId,
      alias: params.alias,
      description: params.description ?? null,
      is_active: true,
      created_at: new Date(),
    })
    .execute();
  return id;
};

export const updateAlias = async (params: {
  aliasId: string;
  userId: string;
  isActive?: boolean;
  description?: string;
}) => {
  return await db
    .updateTable("aliases")
    .set({
      ...(params.isActive !== undefined && { is_active: params.isActive }),
      ...(params.description !== undefined && {
        description: params.description,
      }),
    })
    .where("id", "=", params.aliasId)
    .where("user_id", "=", params.userId)
    .execute();
};

export const deleteAlias = async (params: {
  aliasId: string;
  userId: string;
}) => {
  return await db
    .deleteFrom("aliases")
    .where("id", "=", params.aliasId)
    .where("user_id", "=", params.userId)
    .execute();
};
