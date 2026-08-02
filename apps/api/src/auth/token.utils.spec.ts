import { describe, expect, it } from "vitest";

import { addDays, createOpaqueToken, hashToken } from "./token.utils.js";

describe("token utils", () => {
  it("should create opaque tokens that can be hashed deterministically", () => {
    const token = createOpaqueToken();
    const hash = hashToken(token);

    expect(token).toHaveLength(64);
    expect(hash).toHaveLength(64);
    expect(hashToken(token)).toBe(hash);
    expect(hash).not.toBe(token);
  });

  it("should add days to a date", () => {
    const result = addDays(new Date("2026-08-01T00:00:00.000Z"), 7);

    expect(result.toISOString()).toBe("2026-08-08T00:00:00.000Z");
  });
});
