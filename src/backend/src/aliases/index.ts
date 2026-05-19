import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { getVerifiedUserID } from "../lib/cookies.js";
import {
  createAlias,
  deleteAlias,
  getAliasesByUserId,
  updateAlias,
} from "../lib/db.js";

// --- Helpers ---

const withAuth = (
  handler: (
    userId: string,
    event: APIGatewayProxyEventV2,
  ) => Promise<APIGatewayProxyResultV2>,
) => {
  return async (
    event: APIGatewayProxyEventV2,
  ): Promise<APIGatewayProxyResultV2> => {
    const userId = getVerifiedUserID(event.cookies);
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }
    return handler(userId, event);
  };
};

const isValidAlias = (_alias: string): boolean => {
  // TODO: implement alias validation
  return true;
};

// --- Handlers ---

export const get = withAuth(async (userId) => {
  const aliases = await getAliasesByUserId(userId);
  return {
    statusCode: 200,
    body: JSON.stringify(aliases),
  };
});

export const post = withAuth(async (userId, event) => {
  const { alias, description } = JSON.parse(event.body || "{}");

  if (typeof alias !== "string" || !isValidAlias(alias)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid alias format" }),
    };
  }

  try {
    const id = await createAlias({ userId, alias, description });
    return {
      statusCode: 201,
      body: JSON.stringify({ id, alias, description }),
    };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505" // PostgreSQL Unique Violation
    ) {
      return {
        statusCode: 409,
      };
    }
    throw error;
  }
});

export const patch = withAuth(async (userId, event) => {
  const aliasId = event.pathParameters?.id;
  if (!aliasId) {
    return {
      statusCode: 400,
    };
  }

  const { isActive, description } = JSON.parse(event.body || "{}");

  const result = await updateAlias({
    aliasId,
    userId,
    isActive,
    description,
  });

  if ((result[0]?.numUpdatedRows ?? 0n) === 0n) {
    return {
      statusCode: 404,
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
});

export const del = withAuth(async (userId, event) => {
  const aliasId = event.pathParameters?.id;
  if (!aliasId) {
    return {
      statusCode: 400,
    };
  }

  const result = await deleteAlias({ aliasId, userId });

  if ((result[0]?.numDeletedRows ?? 0n) === 0n) {
    return {
      statusCode: 404,
    };
  }

  return {
    statusCode: 204,
  };
});
