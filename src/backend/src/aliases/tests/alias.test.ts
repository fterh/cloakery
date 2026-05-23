import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVerifiedUserId } from "../../lib/cookies.js";
import {
  createAlias,
  deleteAlias,
  getAliasesByUserId,
  updateAlias,
} from "../../lib/db.js";
import { del, get, isValidAlias, patch, post } from "../index.js";

// Mock dependencies
vi.mock("../../lib/db.js");
vi.mock("../../lib/cookies.js");

describe("Alias Validation", () => {
  it("should pass for valid aliases", () => {
    expect(isValidAlias("hello")).toBe(true);
    expect(isValidAlias("hello-world")).toBe(true);
    expect(isValidAlias("hello_world")).toBe(true);
    expect(isValidAlias("a")).toBe(true);
    expect(isValidAlias("a-b_c")).toBe(true);
    expect(isValidAlias("123")).toBe(true);
    expect(isValidAlias("a".repeat(64))).toBe(true);
  });

  it("should fail for uppercase characters", () => {
    expect(isValidAlias("HELLO")).toBe(false);
    expect(isValidAlias("Hello")).toBe(false);
  });

  it("should fail for invalid characters", () => {
    expect(isValidAlias("hello.world")).toBe(false);
    expect(isValidAlias("hello world")).toBe(false);
    expect(isValidAlias("hello@world")).toBe(false);
  });

  it("should fail for leading or trailing symbols", () => {
    expect(isValidAlias("-hello")).toBe(false);
    expect(isValidAlias("_hello")).toBe(false);
    expect(isValidAlias("hello-")).toBe(false);
    expect(isValidAlias("hello_")).toBe(false);
  });

  it("should fail for consecutive symbols", () => {
    expect(isValidAlias("hello--world")).toBe(false);
    expect(isValidAlias("hello__world")).toBe(false);
    expect(isValidAlias("hello-_world")).toBe(false);
  });

  it("should fail for invalid lengths", () => {
    expect(isValidAlias("")).toBe(false);
    expect(isValidAlias("a".repeat(65))).toBe(false);
  });
});

describe("Alias Handlers", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /aliases", () => {
    it("should return 401 if unauthorized", async () => {
      const event = { cookies: [] } as unknown as APIGatewayProxyEventV2;

      const result = (await get(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body || "{}").error).toBe("Unauthorized");
    });

    it("should return 200 and list of aliases", async () => {
      vi.mocked(getVerifiedUserId).mockReturnValue(mockUserId);
      const mockAliases = [
        { id: "alias-1", alias: "shopping", description: "for shopping" },
      ];
      // biome-ignore lint/suspicious/noExplicitAny: mocked types are complex to define manually
      vi.mocked(getAliasesByUserId).mockResolvedValue(mockAliases as any);

      const event = {
        cookies: ["session=valid"],
      } as unknown as APIGatewayProxyEventV2;

      const result = (await get(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body || "[]")).toEqual(mockAliases);
      expect(getAliasesByUserId).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe("POST /aliases", () => {
    it("should return 201 on successful creation", async () => {
      vi.mocked(getVerifiedUserId).mockReturnValue(mockUserId);
      vi.mocked(createAlias).mockResolvedValue(
        "12345678-1234-1234-1234-123456789012",
      );

      const event = {
        cookies: ["session=valid"],
        body: JSON.stringify({ alias: "shopping", description: "test desc" }),
      } as unknown as APIGatewayProxyEventV2;

      const result = (await post(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body || "{}")).toEqual({
        id: "12345678-1234-1234-1234-123456789012",
        alias: "shopping",
        description: "test desc",
      });
    });

    it("should return 400 if alias is not a string", async () => {
      vi.mocked(getVerifiedUserId).mockReturnValue(mockUserId);

      const event = {
        cookies: ["session=valid"],
        body: JSON.stringify({ alias: 123 }),
      } as unknown as APIGatewayProxyEventV2;

      const result = (await post(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body || "{}").error).toBe(
        "Invalid alias format",
      );
    });

    it("should return 409 if alias already exists", async () => {
      vi.mocked(getVerifiedUserId).mockReturnValue(mockUserId);
      const conflictError = new Error("Conflict");
      // biome-ignore lint/suspicious/noExplicitAny: mocked types are complex to define manually
      (conflictError as any).code = "23505";
      vi.mocked(createAlias).mockRejectedValue(conflictError);

      const event = {
        cookies: ["session=valid"],
        body: JSON.stringify({ alias: "duplicate" }),
      } as unknown as APIGatewayProxyEventV2;

      const result = (await post(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(409);
    });
  });

  describe("PATCH /aliases/{id}", () => {
    it("should return 200 on successful update", async () => {
      vi.mocked(getVerifiedUserId).mockReturnValue(mockUserId);
      vi.mocked(updateAlias).mockResolvedValue([{ numUpdatedRows: 1n }]);

      const event = {
        cookies: ["session=valid"],
        pathParameters: { id: "alias-1" },
        body: JSON.stringify({ isActive: false }),
      } as unknown as APIGatewayProxyEventV2;

      const result = (await patch(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body || "{}").success).toBe(true);
      expect(updateAlias).toHaveBeenCalledWith({
        aliasId: "alias-1",
        userId: mockUserId,
        isActive: false,
        description: undefined,
      });
    });

    it("should return 404 if alias not found", async () => {
      vi.mocked(getVerifiedUserId).mockReturnValue(mockUserId);
      vi.mocked(updateAlias).mockResolvedValue([{ numUpdatedRows: 0n }]);

      const event = {
        cookies: ["session=valid"],
        pathParameters: { id: "non-existent" },
        body: JSON.stringify({ isActive: false }),
      } as unknown as APIGatewayProxyEventV2;

      const result = (await patch(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(404);
    });
  });

  describe("DELETE /aliases/{id}", () => {
    it("should return 204 on successful deletion", async () => {
      vi.mocked(getVerifiedUserId).mockReturnValue(mockUserId);
      vi.mocked(deleteAlias).mockResolvedValue([{ numDeletedRows: 1n }]);

      const event = {
        cookies: ["session=valid"],
        pathParameters: { id: "alias-1" },
      } as unknown as APIGatewayProxyEventV2;

      const result = (await del(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(204);
    });

    it("should return 404 if alias not found", async () => {
      vi.mocked(getVerifiedUserId).mockReturnValue(mockUserId);
      vi.mocked(deleteAlias).mockResolvedValue([{ numDeletedRows: 0n }]);

      const event = {
        cookies: ["session=valid"],
        pathParameters: { id: "non-existent" },
      } as unknown as APIGatewayProxyEventV2;

      const result = (await del(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(404);
    });
  });
});
