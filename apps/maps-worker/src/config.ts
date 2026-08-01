import { z } from "zod";

const workerConfigSchema = z.object({
  databaseUrl: z.string().min(1),
  pollIntervalMs: z.coerce.number().int().positive(),
  screenshotDir: z.string().min(1),
  seleniumHeadless: z.coerce.boolean(),
  seleniumMaxAttempts: z.coerce.number().int().positive(),
  seleniumTimeoutMs: z.coerce.number().int().positive(),
  stalledJobTimeoutMinutes: z.coerce.number().int().positive(),
  fakeMapEmbedUrl: z.string().url(),
});

export type WorkerConfig = z.infer<typeof workerConfigSchema>;

export function loadWorkerConfig(): WorkerConfig {
  return workerConfigSchema.parse({
    databaseUrl: process.env["DATABASE_URL"],
    pollIntervalMs: process.env["WORKER_POLL_INTERVAL_MS"] ?? "5000",
    screenshotDir: process.env["SELENIUM_SCREENSHOT_DIR"] ?? "/storage/selenium-errors",
    seleniumHeadless: process.env["SELENIUM_HEADLESS"] ?? "true",
    seleniumMaxAttempts: process.env["SELENIUM_MAX_ATTEMPTS"] ?? "3",
    seleniumTimeoutMs: process.env["SELENIUM_TIMEOUT_MS"] ?? "60000",
    stalledJobTimeoutMinutes: process.env["WORKER_STALLED_JOB_TIMEOUT_MINUTES"] ?? "15",
    fakeMapEmbedUrl:
      process.env["WORKER_FAKE_MAP_EMBED_URL"] ?? "https://www.google.com/maps/embed?pb=fake",
  });
}
