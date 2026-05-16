import { randomUUID } from "node:crypto";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { makeJWT, makeJWTCookie } from "../lib/cookies.js";
import { createUserWithPasskey, userExists } from "../lib/db.js";
import { kv } from "../lib/kv.js";

const AUTH_CHALLENGE_TTL = 300; // 5-minute TTL
const RP_ID = process.env.RP_ID;
const RP_NAME = process.env.RP_NAME;

if (!RP_ID || !RP_NAME) {
  throw new Error("Missing RP_ID or RP_NAME environment variables");
}

const ORIGIN = `https://${RP_ID}`;

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

    // Check if user already exists
    if (await userExists(email, username)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "email or username already taken" }),
      };
    }

    const userId = randomUUID();

    const registrationOptions = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: username,
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
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { email, response } = body;

    if (!email || !response) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "email and response are required" }),
      };
    }

    const challengeKey = `AUTH_CHALLENGE#${email}`;
    const stored = await kv.get<{
      challenge: string;
      userId: string;
      email: string;
      username: string;
    }>(challengeKey);

    if (!stored) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "challenge not found or expired" }),
      };
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;

      await createUserWithPasskey({
        userId: stored.userId,
        email: stored.email,
        username: stored.username,
        passkey: {
          id: credential.id, // String (base64url)
          publicKey: Buffer.from(credential.publicKey),
          counter: credential.counter,
        },
      });

      await kv.delete(challengeKey);

      const token = makeJWT(stored.userId);
      const cookie = makeJWTCookie(token);

      return {
        statusCode: 200,
        cookies: [cookie],
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: "verification failed" }),
    };
  } catch (error) {
    console.error("Error verifying registration:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "internal server error" }),
    };
  }
};
