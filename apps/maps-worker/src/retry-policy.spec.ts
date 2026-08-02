import { describe, expect, it } from "vitest";

import { getNextAttemptDelayMs, shouldFailPermanently } from "./retry-policy.js";

describe("retry policy", () => {
  it("should schedule the second attempt after one minute", () => {
    expect(getNextAttemptDelayMs(1)).toBe(60_000);
  });

  it("should schedule the third attempt after five minutes", () => {
    expect(getNextAttemptDelayMs(2)).toBe(300_000);
  });

  it("should fail permanently when attempts reach max attempts", () => {
    expect(shouldFailPermanently(3, 3)).toBe(true);
    expect(shouldFailPermanently(2, 3)).toBe(false);
  });
});
