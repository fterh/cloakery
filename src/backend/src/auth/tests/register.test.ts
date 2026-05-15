import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUserWithPasskey, userExists } from "../../lib/db.js";
import { kv } from "../../lib/kv.js";
import { options, verify } from "../register.js";

// Mock dependencies
vi.mock("../../lib/db.js");
vi.mock("../../lib/kv.js");
vi.mock("@simplewebauthn/server");

describe("register.options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if email is missing", async () => {
    const event = {
      body: JSON.stringify({ username: "testuser" }),
    } as APIGatewayProxyEventV2;

    const result = (await options(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || "{}").error).toBe(
      "email and username are required",
    );
  });

  it("should return 400 if username is missing", async () => {
    const event = {
      body: JSON.stringify({ email: "test@example.com" }),
    } as APIGatewayProxyEventV2;

    const result = (await options(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || "{}").error).toBe(
      "email and username are required",
    );
  });

  it("should return 400 if user already exists", async () => {
    vi.mocked(userExists).mockResolvedValue(true);

    const event = {
      body: JSON.stringify({ email: "test@example.com", username: "testuser" }),
    } as APIGatewayProxyEventV2;

    const result = (await options(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || "{}").error).toBe(
      "email or username already taken",
    );
    expect(userExists).toHaveBeenCalledWith("test@example.com", "testuser");
  });

  it("should return 200 and save challenge on success", async () => {
    vi.mocked(userExists).mockResolvedValue(false);
    vi.mocked(generateRegistrationOptions).mockResolvedValue({
      challenge: "mock-challenge",
      rp: { name: "Cloakery", id: "cloakery.io" },
      user: {
        id: "mock-user-id",
        name: "test@example.com",
        displayName: "testuser",
      },
      pubKeyCredParams: [],
    });

    const event = {
      body: JSON.stringify({ email: "test@example.com", username: "testuser" }),
    } as APIGatewayProxyEventV2;

    const result = (await options(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body || "{}");
    expect(body.challenge).toBe("mock-challenge");

    expect(kv.set).toHaveBeenCalledWith(
      "AUTH_CHALLENGE#test@example.com",
      expect.objectContaining({
        challenge: "mock-challenge",
        email: "test@example.com",
        username: "testuser",
      }),
      300,
    );
  });
});

describe("register.verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if email is missing", async () => {
    const event = {
      body: JSON.stringify({ response: {} }),
    } as APIGatewayProxyEventV2;

    const result = (await verify(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || "{}").error).toBe(
      "email and response are required",
    );
  });

  it("should return 400 if challenge is not found in KV", async () => {
    vi.mocked(kv.get).mockResolvedValue(null);

    const event = {
      body: JSON.stringify({ email: "test@example.com", response: {} }),
    } as APIGatewayProxyEventV2;

    const result = (await verify(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || "{}").error).toBe(
      "challenge not found or expired",
    );
  });

  it("should return 400 if verification fails", async () => {
    vi.mocked(kv.get).mockResolvedValue({
      challenge: "stored-challenge",
      userId: "user-id",
      email: "test@example.com",
      username: "testuser",
    });
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: false,
    });

    const event = {
      body: JSON.stringify({
        email: "test@example.com",
        response: { id: "cred-id" },
      }),
    } as APIGatewayProxyEventV2;

    const result = (await verify(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || "{}").error).toBe("verification failed");
  });

  it("should return 200 and create user on success", async () => {
    vi.mocked(kv.get).mockResolvedValue({
      challenge: "stored-challenge",
      userId: "user-id",
      email: "test@example.com",
      username: "testuser",
    });
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "cred-id",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
        },
      },
      // biome-ignore lint/suspicious/noExplicitAny: mocked types are complex to define manually
    } as any);

    const event = {
      body: JSON.stringify({
        email: "test@example.com",
        response: { id: "cred-id" },
      }),
    } as APIGatewayProxyEventV2;

    const result = (await verify(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body || "{}").success).toBe(true);

    expect(createUserWithPasskey).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-id",
        email: "test@example.com",
        username: "testuser",
        passkey: expect.objectContaining({
          counter: 0,
        }),
      }),
    );
    expect(kv.delete).toHaveBeenCalledWith("AUTH_CHALLENGE#test@example.com");
  });
});
