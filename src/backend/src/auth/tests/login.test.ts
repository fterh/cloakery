import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserWithPasskeys } from "../../lib/db.js";
import { kv } from "../../lib/kv.js";
import { options } from "../login.js";

// Mock dependencies
vi.mock("../../lib/db.js");
vi.mock("../../lib/kv.js");
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
    });

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
