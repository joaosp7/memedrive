import { describe, expect, it } from "vitest";
import { signExpiresSeconds } from "./expires";

describe("signExpiresSeconds", () => {
  it("returns the configured value when within range", () => {
    expect(signExpiresSeconds({ R2_SIGN_EXPIRES_SECONDS: "1800" })).toBe(1800);
  });

  it("falls back to 3600 when unset", () => {
    expect(signExpiresSeconds({})).toBe(3600);
  });

  it("falls back to 3600 when the value is not a number", () => {
    expect(signExpiresSeconds({ R2_SIGN_EXPIRES_SECONDS: "not-a-number" })).toBe(3600);
  });

  it("falls back to 3600 when the value is negative", () => {
    expect(signExpiresSeconds({ R2_SIGN_EXPIRES_SECONDS: "-60" })).toBe(3600);
  });

  it("falls back to 3600 when the value is zero", () => {
    expect(signExpiresSeconds({ R2_SIGN_EXPIRES_SECONDS: "0" })).toBe(3600);
  });

  it("falls back to 3600 when the value exceeds the SigV4 cap", () => {
    expect(signExpiresSeconds({ R2_SIGN_EXPIRES_SECONDS: "604801" })).toBe(3600);
  });

  it("accepts the SigV4 cap itself", () => {
    expect(signExpiresSeconds({ R2_SIGN_EXPIRES_SECONDS: "604800" })).toBe(604800);
  });

  it("falls back to 3600 when the value is non-finite", () => {
    expect(signExpiresSeconds({ R2_SIGN_EXPIRES_SECONDS: "Infinity" })).toBe(3600);
  });

  it("floors fractional values", () => {
    expect(signExpiresSeconds({ R2_SIGN_EXPIRES_SECONDS: "1800.7" })).toBe(1800);
  });
});
