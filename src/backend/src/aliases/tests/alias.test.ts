import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVerifiedUserID } from "../../lib/cookies.js";
import {
  createAlias,
  deleteAlias,
  getAliasesByUserId,
  updateAlias,
} from "../../lib/db.js";
import { del, get, patch, post } from "../index.js";

// Mock dependencies
vi.mock("../../lib/db.js");
vi.mock("../../lib/cookies.js");

describe("Alias Handlers", () => {
  const mockUserID = "user-123";

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
      vi.mocked(getVerifiedUserID).mockReturnValue(mockUserID);
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
      expect(getAliasesByUserId).toHaveBeenCalledWith(mockUserID);
    });
  });

  describe("POST /aliases", () => {
    it("should return 201 on successful creation", async () => {
      vi.mocked(getVerifiedUserID).mockReturnValue(mockUserID);
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
      vi.mocked(getVerifiedUserID).mockReturnValue(mockUserID);

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
      vi.mocked(getVerifiedUserID).mockReturnValue(mockUserID);
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
      vi.mocked(getVerifiedUserID).mockReturnValue(mockUserID);
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
        userId: mockUserID,
        isActive: false,
        description: undefined,
      });
    });

    it("should return 404 if alias not found", async () => {
      vi.mocked(getVerifiedUserID).mockReturnValue(mockUserID);
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
      vi.mocked(getVerifiedUserID).mockReturnValue(mockUserID);
      vi.mocked(deleteAlias).mockResolvedValue([{ numDeletedRows: 1n }]);

      const event = {
        cookies: ["session=valid"],
        pathParameters: { id: "alias-1" },
      } as unknown as APIGatewayProxyEventV2;

      const result = (await del(event)) as APIGatewayProxyStructuredResultV2;

      expect(result.statusCode).toBe(204);
    });

    it("should return 404 if alias not found", async () => {
      vi.mocked(getVerifiedUserID).mockReturnValue(mockUserID);
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
