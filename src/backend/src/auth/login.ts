import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { makeJwt, makeJwtCookie } from "../lib/cookies.js";
import {
  getPasskey,
  getUserWithPasskeys,
  updatePasskeyCounter,
} from "../lib/db.js";
import { kv } from "../lib/kv.js";

const AUTH_CHALLENGE_TTL = 300;
const RP_ID = process.env.RP_ID;

if (!RP_ID) {
  throw new Error("Missing RP_ID environment variable");
}

const ORIGIN = `https://${RP_ID}`;

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
        id: pk.id, // String (base64url)
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
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { username, response } = body;

    if (!username || !response) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "username and response are required" }),
      };
    }

    const challengeKey = `AUTH_CHALLENGE#${username}`;
    const stored = await kv.get<{ challenge: string; userId: string }>(
      challengeKey,
    );

    if (!stored) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "challenge not found or expired" }),
      };
    }

    const passkey = await getPasskey(response.id);
    if (!passkey || passkey.user_id !== stored.userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "invalid credential" }),
      };
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.id,
        publicKey: new Uint8Array(passkey.public_key),
        counter: passkey.counter,
      },
    });

    if (verification.verified) {
      await updatePasskeyCounter(
        passkey.id,
        verification.authenticationInfo.newCounter,
      );
      await kv.delete(challengeKey);

      const token = makeJwt(stored.userId);
      const cookie = makeJwtCookie(token);

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
    console.error("Error verifying login:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "internal server error" }),
    };
  }
};
