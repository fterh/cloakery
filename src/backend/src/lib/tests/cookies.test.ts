import { describe, expect, it } from "vitest";
import { getVerifiedUserId, makeJwt } from "../cookies.js";

describe("getVerifiedUserID", () => {
  it("should return null if no cookies are provided", () => {
    expect(getVerifiedUserId(undefined)).toBeNull();
  });

  it("should return null if session cookie is missing", () => {
    expect(getVerifiedUserId(["foo=bar", "baz=qux"])).toBeNull();
  });

  it("should return userId if session cookie is valid", () => {
    const userId = "test-user-id";
    const token = makeJwt(userId);
    expect(getVerifiedUserId([`session=${token}`])).toBe(userId);
  });

  it("should return userId when multiple cookies are present", () => {
    const userId = "test-user-id";
    const token = makeJwt(userId);
    expect(
      getVerifiedUserId(["other=value", `session=${token}`, "foo=bar"]),
    ).toBe(userId);
  });

  it("should return null if token is invalid", () => {
    expect(getVerifiedUserId(["session=invalid-token"])).toBeNull();
  });
});
