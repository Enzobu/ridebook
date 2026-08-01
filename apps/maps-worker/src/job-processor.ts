import { MapEmbedJob } from "@prisma/client";

import { JobRepository } from "./job-repository.js";
import { MapEmbedExtractor } from "./map-embed-extractor.js";

export class JobProcessor {
  constructor(
    private readonly extractor: MapEmbedExtractor,
    private readonly repository: JobRepository,
  ) {}

  async process(job: MapEmbedJob): Promise<void> {
    try {
      const googleMapsUrl = await this.repository.getTripGoogleMapsUrl(job.tripId);
      const mapEmbedUrl = await this.extractor.extract(googleMapsUrl);
      await this.repository.markSuccess(job, mapEmbedUrl);
    } catch (error) {
      await this.repository.markFailure(job, error instanceof Error ? error : new Error("Erreur inconnue."));
    }
  }
}
