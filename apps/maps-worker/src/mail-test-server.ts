import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import type { WorkerConfig } from "./config.js";
import { SmtpFailureNotifier } from "./failure-notifier.js";

interface TestMailPayload {
  recipient?: string;
  type?: string;
}

export function startMailTestServer(config: WorkerConfig, port = 3002): void {
  createServer((request, response) => {
    void handleRequest(request, response, config);
  }).listen(port, "0.0.0.0", () => {
    process.stdout.write(JSON.stringify({ event: "worker.mail-test-server.started", port }) + "\n");
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  config: WorkerConfig,
): Promise<void> {
  if (request.method !== "POST" || request.url !== "/internal/mail/test") {
    response.writeHead(404).end();
    return;
  }

  try {
    const payload = JSON.parse(await readBody(request)) as TestMailPayload;
    if (!payload.recipient || !isEmail(payload.recipient) || payload.type !== "WORKER_FAILURE") {
      response.writeHead(400).end();
      return;
    }

    if (!config.smtpUser || !config.smtpPassword) {
      response.writeHead(503).end();
      return;
    }

    const notifier = new SmtpFailureNotifier({
      from: config.smtpFrom,
      host: config.smtpHost,
      password: config.smtpPassword,
      port: config.smtpPort,
      secure: config.smtpSecure,
      to: payload.recipient,
      user: config.smtpUser,
    });

    await notifier.notify({
      attempts: 3,
      failedAt: new Date(),
      googleMapsUrl: "https://www.google.com/maps",
      jobId: "test-job-id",
      lastError: "Email de test: exemple de défaillance Selenium.",
      maxAttempts: 3,
      tripId: "test-trip-id",
      tripName: "Balade de démonstration",
    });

    response.writeHead(204).end();
  } catch (error) {
    process.stderr.write(JSON.stringify({ event: "worker.mail-test.failed", error: String(error) }) + "\n");
    response.writeHead(500).end();
  }
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
      if (body.length > 16_384) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}
