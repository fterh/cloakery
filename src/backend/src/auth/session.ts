import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { clearSessionCookie, getVerifiedUserID } from "../lib/cookies.js";
import { getUserById } from "../lib/db.js";

export const me = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const userId = getVerifiedUserID(event.cookies);

  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  const user = await getUserById(userId);

  if (!user) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "User not found" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      id: user.id,
      username: user.username,
      email: user.email,
    }),
  };
};

export const logout = async (): Promise<APIGatewayProxyResultV2> => {
  return {
    statusCode: 200,
    cookies: [clearSessionCookie()],
    body: JSON.stringify({ success: true }),
  };
};
