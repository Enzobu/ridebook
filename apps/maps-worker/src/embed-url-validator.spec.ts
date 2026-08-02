import { describe, expect, it } from "vitest";

import { assertValidGoogleMapsEmbedUrl } from "./embed-url-validator.js";

describe("assertValidGoogleMapsEmbedUrl", () => {
  it("should accept Google Maps embed URLs", () => {
    const result = assertValidGoogleMapsEmbedUrl("https://www.google.com/maps/embed?pb=fake");

    expect(result).toBe("https://www.google.com/maps/embed?pb=fake");
  });

  it("should reject non-Google origins", () => {
    expect(() => assertValidGoogleMapsEmbedUrl("https://evil.example/maps/embed?pb=fake")).toThrow(
      "Origine Google Maps embed non autorisée.",
    );
  });

  it("should reject non-HTTPS URLs", () => {
    expect(() => assertValidGoogleMapsEmbedUrl("http://www.google.com/maps/embed?pb=fake")).toThrow(
      "URL embed Google Maps non HTTPS refusée.",
    );
  });
});
