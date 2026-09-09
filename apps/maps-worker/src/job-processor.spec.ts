import { MapEmbedJob, MapEmbedJobStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { JobProcessor } from "./job-processor.js";
import { JobRepository } from "./job-repository.js";
import { FakeMapEmbedExtractor, MapExtractionResult } from "./map-embed-extractor.js";

describe("JobProcessor", () => {
  it("should persist the complete selenium extraction on success", async () => {
    const job = buildJob();
    const repository = new FakeJobRepository();
    const extractor = new FakeMapEmbedExtractor("https://www.google.com/maps/embed?pb=fake", {
      distanceKm: 118.4,
      durationMinutes: 97,
    });
    const processor = new JobProcessor(extractor, repository.asJobRepository());

    await processor.process(job);

    expect(repository.success).toEqual({
      extraction: {
        distanceKm: 118.4,
        durationMinutes: 97,
        mapEmbedUrl: "https://www.google.com/maps/embed?pb=fake",
      },
      jobId: job.id,
    });
    expect(repository.failure).toBeUndefined();
  });
});

class FakeJobRepository {
  success: { extraction: MapExtractionResult; jobId: string } | undefined;
  failure: Error | undefined;

  async getTripGoogleMapsUrl(_tripId: string): Promise<string> {
    return "https://maps.app.goo.gl/fake";
  }

  async markSuccess(job: MapEmbedJob, extraction: MapExtractionResult): Promise<void> {
    this.success = { extraction, jobId: job.id };
  }

  async markFailure(_job: MapEmbedJob, error: Error): Promise<void> {
    this.failure = error;
  }

  asJobRepository(): JobRepository {
    // WHY: this test double implements only the methods used by JobProcessor.
    return this as unknown as JobRepository;
  }
}

function buildJob(): MapEmbedJob {
  const now = new Date("2026-08-01T00:00:00.000Z");

  return {
    attempts: 1,
    completedAt: null,
    createdAt: now,
    failedAt: null,
    failureNotifiedAt: null,
    id: "job-id",
    lastError: null,
    maxAttempts: 3,
    nextAttemptAt: now,
    requestedAt: now,
    startedAt: now,
    status: MapEmbedJobStatus.PROCESSING,
    tripId: "trip-id",
    updatedAt: now,
  };
}
