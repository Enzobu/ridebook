import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { TestMailType } from "./dto/send-test-mail.dto.js";

interface WorkerErrorPayload {
  message?: string;
}

@Injectable()
export class AdminMailService {
  constructor(private readonly configService: ConfigService) {}

  async sendTestMail(recipient: string, type: TestMailType): Promise<void> {
    const workerUrl = this.configService.get<string>("MAPS_WORKER_URL") ?? "http://maps-worker:3002";

    let response: Response;
    try {
      response = await fetch(`${workerUrl}/internal/mail/test`, {
        body: JSON.stringify({ recipient, type }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
    } catch {
      throw new ServiceUnavailableException(
        "Maps worker indisponible. Vérifie qu'il est démarré et joignable par l'API.",
      );
    }

    if (!response.ok) {
      let message = "Impossible d'envoyer l'email de test.";

      try {
        const payload = (await response.json()) as WorkerErrorPayload;
        if (payload.message) {
          message = payload.message;
        }
      } catch {
        // Keep the stable fallback when the worker response is not JSON.
      }

      throw new ServiceUnavailableException(message);
    }
  }
}
