import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { TestMailType } from "./dto/send-test-mail.dto.js";

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
      throw new ServiceUnavailableException("Maps worker is unavailable.");
    }

    if (!response.ok) {
      throw new ServiceUnavailableException("Test email could not be sent.");
    }
  }
}
