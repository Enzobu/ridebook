import { mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

import { loadWorkerConfig } from "./config.js";
import { DisabledFailureNotifier, FailureNotifier, SmtpFailureNotifier } from "./failure-notifier.js";
import { JobProcessor } from "./job-processor.js";
import { JobRepository } from "./job-repository.js";
import { startMailTestServer } from "./mail-test-server.js";
import { FakeMapEmbedExtractor, MapEmbedExtractor, SeleniumMapEmbedExtractor } from "./map-embed-extractor.js";

async function bootstrap(): Promise<void> {
  const config = loadWorkerConfig();
  await mkdir(config.screenshotDir, { recursive: true });
  const prisma = new PrismaClient();
  const repository = new JobRepository(prisma);
  const extractor = createExtractor(config);
  const notifier = createFailureNotifier(config);
  const processor = new JobProcessor(extractor, repository);

  startMailTestServer(config, Number(process.env["MAIL_TEST_PORT"] ?? "3002"));

  process.stdout.write(
    JSON.stringify({
      event: "worker.started",
      extractorMode: config.extractorMode,
      pollIntervalMs: config.pollIntervalMs,
      screenshotDir: config.screenshotDir,
      seleniumHeadless: config.seleniumHeadless,
    }) + "\n",
  );

  setInterval(() => {
    void tick(repository, processor, notifier, config.stalledJobTimeoutMinutes).catch((error: unknown) => {
      process.stderr.write(JSON.stringify({ event: "worker.tick.failed", error: serializeError(error) }) + "\n");
    });
  }, config.pollIntervalMs);
}

async function tick(
  repository: JobRepository,
  processor: JobProcessor,
  notifier: FailureNotifier,
  stalledJobTimeoutMinutes: number,
): Promise<void> {
  const recoveredNotifications = await repository.recoverStalledJobs(stalledJobTimeoutMinutes);
  await Promise.all(recoveredNotifications.map((notification) => notifier.notify(notification)));
  const job = await repository.claimNextJob();

  if (!job) {
    process.stdout.write(JSON.stringify({ event: "worker.idle", recovered: recoveredNotifications.length }) + "\n");
    return;
  }

  process.stdout.write(JSON.stringify({ event: "worker.job.claimed", jobId: job.id }) + "\n");
  const notification = await processor.process(job);

  if (notification) {
    await notifier.notify(notification);
  }
}

void bootstrap();

function createExtractor(config: ReturnType<typeof loadWorkerConfig>): MapEmbedExtractor {
  if (config.extractorMode === "fake") {
    return new FakeMapEmbedExtractor(config.fakeMapEmbedUrl);
  }

  return new SeleniumMapEmbedExtractor({
    binaryPath: config.seleniumBinaryPath,
    headless: config.seleniumHeadless,
    screenshotDir: config.screenshotDir,
    timeoutMs: config.seleniumTimeoutMs,
  });
}

function createFailureNotifier(config: ReturnType<typeof loadWorkerConfig>): FailureNotifier {
  if (!config.smtpUser || !config.smtpPassword) {
    return new DisabledFailureNotifier();
  }

  return new SmtpFailureNotifier({
    from: config.smtpFrom,
    host: config.smtpHost,
    password: config.smtpPassword,
    port: config.smtpPort,
    secure: config.smtpSecure,
    to: config.adminNotificationEmail,
    user: config.smtpUser,
  });
}

function serializeError(error: unknown): { message: string; name: string } {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }

  return { message: String(error), name: "UnknownError" };
}
