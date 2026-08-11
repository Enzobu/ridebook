import { z } from "zod";

const envBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return value;
}, z.boolean());

const workerConfigSchema = z.object({
  adminNotificationEmail: z.string().email(),
  databaseUrl: z.string().min(1),
  extractorMode: z.enum(["fake", "selenium"]),
  pollIntervalMs: z.coerce.number().int().positive(),
  screenshotDir: z.string().min(1),
  seleniumBinaryPath: z.string().min(1),
  seleniumHeadless: envBoolean,
  seleniumMaxAttempts: z.coerce.number().int().positive(),
  seleniumTimeoutMs: z.coerce.number().int().positive(),
  smtpFrom: z.string().min(1),
  smtpHost: z.string().min(1),
  smtpPassword: z.string(),
  smtpPort: z.coerce.number().int().positive(),
  smtpSecure: envBoolean,
  smtpUser: z.string(),
  stalledJobTimeoutMinutes: z.coerce.number().int().positive(),
  fakeMapEmbedUrl: z.string().url(),
});

export type WorkerConfig = z.infer<typeof workerConfigSchema>;

export function loadWorkerConfig(): WorkerConfig {
  return workerConfigSchema.parse({
    adminNotificationEmail: process.env["ADMIN_NOTIFICATION_EMAIL"] ?? "admin@example.com",
    databaseUrl: process.env["DATABASE_URL"],
    extractorMode: process.env["WORKER_EXTRACTOR_MODE"] ?? "selenium",
    pollIntervalMs: process.env["WORKER_POLL_INTERVAL_MS"] ?? "5000",
    screenshotDir: process.env["SELENIUM_SCREENSHOT_DIR"] ?? "/storage/selenium-errors",
    seleniumBinaryPath: process.env["SELENIUM_BINARY_PATH"] ?? "/usr/bin/chromium",
    seleniumHeadless: process.env["SELENIUM_HEADLESS"] ?? "true",
    seleniumMaxAttempts: process.env["SELENIUM_MAX_ATTEMPTS"] ?? "3",
    seleniumTimeoutMs: process.env["SELENIUM_TIMEOUT_MS"] ?? "60000",
    smtpFrom: process.env["SMTP_FROM"] ?? "Ridebook <no-reply@example.com>",
    smtpHost: process.env["SMTP_HOST"] ?? "ssl0.ovh.net",
    smtpPassword: process.env["SMTP_PASSWORD"] ?? "",
    smtpPort: process.env["SMTP_PORT"] ?? "587",
    smtpSecure: process.env["SMTP_SECURE"] ?? "false",
    smtpUser: process.env["SMTP_USER"] ?? "",
    stalledJobTimeoutMinutes: process.env["WORKER_STALLED_JOB_TIMEOUT_MINUTES"] ?? "15",
    fakeMapEmbedUrl:
      process.env["WORKER_FAKE_MAP_EMBED_URL"] ?? "https://www.google.com/maps/embed?pb=fake",
  });
}
