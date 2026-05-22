import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeJwt, makeJwtCookie } from "../../lib/cookies.js";
import {
  getPasskey,
  getUserWithPasskeys,
  updatePasskeyCounter,
} from "../../lib/db.js";
import { kv } from "../../lib/kv.js";
import { options, verify } from "../login.js";

// Mock dependencies
vi.mock("../../lib/db.js");
vi.mock("../../lib/kv.js");
vi.mock("../../lib/cookies.js");
vi.mock("@simplewebauthn/server");

describe("login.options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if username is missing", async () => {
    const event = {
      body: JSON.stringify({}),
    } as APIGatewayProxyEventV2;

    const result = (await options(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || "{}").error).toBe("username is required");
  });

  it("should return 404 if user is not found", async () => {
    vi.mocked(getUserWithPasskeys).mockResolvedValue(null);

    const event = {
      body: JSON.stringify({ username: "nonexistent" }),
    } as APIGatewayProxyEventV2;

    const result = (await options(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body || "{}").error).toBe("user not found");
  });

  it("should return 200 and save challenge on success", async () => {
    vi.mocked(getUserWithPasskeys).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      passkeys: [{ id: "cred-1" }],
    });
    vi.mocked(generateAuthenticationOptions).mockResolvedValue({
      challenge: "mock-challenge",
      allowCredentials: [{ id: "cred-1", type: "public-key" }],
      // biome-ignore lint/suspicious/noExplicitAny: mocked types are complex to define manually
    } as any);

    const event = {
      body: JSON.stringify({ username: "testuser" }),
    } as APIGatewayProxyEventV2;

    const result = (await options(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body || "{}");
    expect(body.challenge).toBe("mock-challenge");

    expect(kv.set).toHaveBeenCalledWith(
      "AUTH_CHALLENGE#testuser",
      {
        challenge: "mock-challenge",
        userId: "user-123",
      },
      300,
    );
  });
});

describe("login.verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if username or response is missing", async () => {
    const event = {
      body: JSON.stringify({ username: "testuser" }),
    } as APIGatewayProxyEventV2;

    const result = (await verify(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || "{}").error).toBe(
      "username and response are required",
    );
  });

  it("should return 400 if challenge is not found", async () => {
    vi.mocked(kv.get).mockResolvedValue(null);

    const event = {
      body: JSON.stringify({
        username: "testuser",
        response: { id: "cred-1" },
      }),
    } as APIGatewayProxyEventV2;

    const result = (await verify(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || "{}").error).toBe(
      "challenge not found or expired",
    );
  });

  it("should return 400 if passkey is not found or user mismatch", async () => {
    vi.mocked(kv.get).mockResolvedValue({
      challenge: "chall",
      userId: "user-1",
    });
    vi.mocked(getPasskey).mockResolvedValue(null);

    const event = {
      body: JSON.stringify({
        username: "testuser",
        response: { id: "cred-1" },
      }),
    } as APIGatewayProxyEventV2;

    const result = (await verify(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || "{}").error).toBe("invalid credential");
  });

  it("should return 200 and set cookie on success", async () => {
    vi.mocked(kv.get).mockResolvedValue({
      challenge: "chall",
      userId: "user-1",
    });
    vi.mocked(getPasskey).mockResolvedValue({
      id: "cred-1",
      user_id: "user-1",
      public_key: Buffer.from("pubkey"),
      counter: 10,
    });
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 11 },
      // biome-ignore lint/suspicious/noExplicitAny: mocked types are complex to define manually
    } as any);
    vi.mocked(makeJwt).mockReturnValue("mock-jwt");
    vi.mocked(makeJwtCookie).mockReturnValue("session=mock-jwt; Path=/");

    const event = {
      body: JSON.stringify({
        username: "testuser",
        response: { id: "cred-1" },
      }),
    } as APIGatewayProxyEventV2;

    const result = (await verify(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(200);
    expect(result.cookies?.[0]).toBe("session=mock-jwt; Path=/");
    expect(updatePasskeyCounter).toHaveBeenCalledWith("cred-1", 11);
    expect(kv.delete).toHaveBeenCalledWith("AUTH_CHALLENGE#testuser");
  });
});
