import { randomUUID } from "node:crypto";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { kv } from "../lib/kv.js";

const AUTH_CHALLENGE_TTL = 300; // 5-minute TTL
const RP_ID = "cloakery.io";
const RP_NAME = "Cloakery";

export const options = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { email, username } = body;

    if (!email || !username) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "email and username are required" }),
      };
    }

    const userId = randomUUID();

    const registrationOptions = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: Buffer.from(userId),
      userName: email,
      userDisplayName: username,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    await kv.set(
      `AUTH_CHALLENGE#${email}`,
      {
        challenge: registrationOptions.challenge,
        userId,
        email,
        username,
      },
      AUTH_CHALLENGE_TTL,
    );

    return {
      statusCode: 200,
      body: JSON.stringify(registrationOptions),
    };
  } catch (error) {
    console.error("Error generating registration options:", error);
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
    body: JSON.stringify({ message: "registration verify ok" }),
  };
};
