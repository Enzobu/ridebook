import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { assertGoogleMapsUrl } from "./google-maps-url.validator.js";

describe("assertGoogleMapsUrl", () => {
  it.each([
    "https://maps.app.goo.gl/abc123",
    "https://goo.gl/maps/abc123",
    "https://www.google.com/maps/dir/example",
    "https://google.fr/maps/place/example",
  ])("should accept allowed Google Maps URL %s", (url) => {
    expect(() => assertGoogleMapsUrl(url)).not.toThrow();
  });

  it.each([
    "http://www.google.com/maps/dir/example",
    "https://example.com/maps/dir/example",
    "file:///etc/passwd",
    "https://www.google.com/search?q=ridebook",
    "https://127.0.0.1/maps/dir/example",
  ])("should reject unsafe URL %s", (url) => {
    expect(() => assertGoogleMapsUrl(url)).toThrow(BadRequestException);
  });
});
