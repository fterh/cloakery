import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { getUserWithPasskeys } from "../lib/db.js";
import { kv } from "../lib/kv.js";

const AUTH_CHALLENGE_TTL = 300;
const RP_ID = process.env.RP_ID;

if (!RP_ID) {
  throw new Error("Missing RP_ID environment variable");
}

export const options = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { username } = body;

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "username is required" }),
      };
    }

    const user = await getUserWithPasskeys(username);
    if (!user || user.passkeys.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "user not found" }),
      };
    }

    const authOptions = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: user.passkeys.map((pk) => ({
        id: pk.id,
        type: "public-key",
      })),
      userVerification: "preferred",
    });

    await kv.set(
      `AUTH_CHALLENGE#${username}`,
      {
        challenge: authOptions.challenge,
        userId: user.id,
      },
      AUTH_CHALLENGE_TTL,
    );

    return {
      statusCode: 200,
      body: JSON.stringify(authOptions),
    };
  } catch (error) {
    console.error("Error generating login options:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "internal server error" }),
    };
  }
};

export const verify = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "login verify ok" }),
  };
};
