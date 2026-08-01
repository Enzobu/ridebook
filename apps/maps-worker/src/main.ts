import { mkdir } from "node:fs/promises";

import { loadWorkerConfig } from "./config.js";

async function bootstrap(): Promise<void> {
  const config = loadWorkerConfig();
  await mkdir(config.screenshotDir, { recursive: true });

  process.stdout.write(
    JSON.stringify({
      event: "worker.started",
      pollIntervalMs: config.pollIntervalMs,
      screenshotDir: config.screenshotDir,
      seleniumHeadless: config.seleniumHeadless,
    }) + "\n",
  );

  setInterval(() => {
    process.stdout.write(JSON.stringify({ event: "worker.heartbeat" }) + "\n");
  }, config.pollIntervalMs).unref();
}

void bootstrap();
