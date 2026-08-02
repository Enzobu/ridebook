import { describe, expect, it } from "vitest";

import { buildFailureEmailText, extractScreenshotPath, MapFailureNotification } from "./failure-notifier.js";

describe("failure notifier", () => {
  it("should extract the Selenium screenshot path from an error message", () => {
    const result = extractScreenshotPath(
      "Extraction Google Maps impossible: iframe missing. Diagnostic: /storage/selenium-errors/maps-extraction-2026.png",
    );

    expect(result).toBe("/storage/selenium-errors/maps-extraction-2026.png");
  });

  it("should build an actionable failure email", () => {
    const notification: MapFailureNotification = {
      attempts: 3,
      failedAt: new Date("2026-08-01T12:00:00.000Z"),
      googleMapsUrl: "https://www.google.com/maps/dir/example",
      jobId: "job-id",
      lastError: "Erreur définitive",
      maxAttempts: 3,
      tripId: "trip-id",
      tripName: "Boucle test",
    };

    const result = buildFailureEmailText(notification);

    expect(result).toContain("Boucle test");
    expect(result).toContain("Tentatives: 3/3");
    expect(result).toContain("URL navigateur: https://www.google.com/maps/dir/example");
  });
});
