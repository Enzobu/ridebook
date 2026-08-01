import { mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

import { loadWorkerConfig } from "./config.js";
import { JobProcessor } from "./job-processor.js";
import { JobRepository } from "./job-repository.js";
import { FakeMapEmbedExtractor } from "./map-embed-extractor.js";

async function bootstrap(): Promise<void> {
  const config = loadWorkerConfig();
  await mkdir(config.screenshotDir, { recursive: true });
  const prisma = new PrismaClient();
  const repository = new JobRepository(prisma);
  const extractor = new FakeMapEmbedExtractor(config.fakeMapEmbedUrl);
  const processor = new JobProcessor(extractor, repository);

  process.stdout.write(
    JSON.stringify({
      event: "worker.started",
      pollIntervalMs: config.pollIntervalMs,
      screenshotDir: config.screenshotDir,
      seleniumHeadless: config.seleniumHeadless,
    }) + "\n",
  );

  setInterval(() => {
    void tick(repository, processor, config.stalledJobTimeoutMinutes);
  }, config.pollIntervalMs);
}

async function tick(
  repository: JobRepository,
  processor: JobProcessor,
  stalledJobTimeoutMinutes: number,
): Promise<void> {
  const recovered = await repository.recoverStalledJobs(stalledJobTimeoutMinutes);
  const job = await repository.claimNextJob();

  if (!job) {
    process.stdout.write(JSON.stringify({ event: "worker.idle", recovered }) + "\n");
    return;
  }

  process.stdout.write(JSON.stringify({ event: "worker.job.claimed", jobId: job.id }) + "\n");
  await processor.process(job);
}

void bootstrap();
