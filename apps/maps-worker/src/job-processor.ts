import { MapEmbedJob } from "@prisma/client";

import { MapFailureNotification } from "./failure-notifier.js";
import { JobRepository } from "./job-repository.js";
import { MapEmbedExtractor } from "./map-embed-extractor.js";

export class JobProcessor {
  constructor(
    private readonly extractor: MapEmbedExtractor,
    private readonly repository: JobRepository,
  ) {}

  async process(job: MapEmbedJob): Promise<MapFailureNotification | null> {
    try {
      const googleMapsUrl = await this.repository.getTripGoogleMapsUrl(job.tripId);
      const mapEmbedUrl = await this.extractor.extract(googleMapsUrl);
      await this.repository.markSuccess(job, mapEmbedUrl);
      return null;
    } catch (error) {
      return this.repository.markFailure(job, error instanceof Error ? error : new Error("Erreur inconnue."));
    }
  }
}
