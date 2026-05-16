import { describe, expect, it } from "vitest";
import { getVerifiedUserID, makeJWT } from "../cookies.js";

describe("getVerifiedUserID", () => {
  it("should return null if no cookies are provided", () => {
    expect(getVerifiedUserID(undefined)).toBeNull();
  });

  it("should return null if session cookie is missing", () => {
    expect(getVerifiedUserID(["foo=bar", "baz=qux"])).toBeNull();
  });

  it("should return userId if session cookie is valid", () => {
    const userId = "test-user-id";
    const token = makeJWT(userId);
    expect(getVerifiedUserID([`session=${token}`])).toBe(userId);
  });

  it("should return userId when multiple cookies are present", () => {
    const userId = "test-user-id";
    const token = makeJWT(userId);
    expect(
      getVerifiedUserID(["other=value", `session=${token}`, "foo=bar"]),
    ).toBe(userId);
  });

  it("should return null if token is invalid", () => {
    expect(getVerifiedUserID(["session=invalid-token"])).toBeNull();
  });
});
