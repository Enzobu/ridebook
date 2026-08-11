import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

import type { TestMailType } from "./dto/send-test-mail.dto.js";

@Injectable()
export class AdminMailService {
  constructor(private readonly configService: ConfigService) {}

  async sendTestMail(recipient: string, type: TestMailType): Promise<void> {
    const host = this.configService.get<string>("SMTP_HOST") ?? "";
    const port = Number(this.configService.get<string>("SMTP_PORT") ?? "587");
    const secure = (this.configService.get<string>("SMTP_SECURE") ?? "false") === "true";
    const user = this.configService.get<string>("SMTP_USER") ?? "";
    const password = this.configService.get<string>("SMTP_PASSWORD") ?? "";
    const from = this.configService.get<string>("SMTP_FROM") ?? "Ridebook <no-reply@example.com>";

    if (!host) {
      throw new ServiceUnavailableException("SMTP is not configured.");
    }

    const transporter = nodemailer.createTransport({
      auth: user ? { pass: password, user } : undefined,
      host,
      port,
      secure,
    });

    const message = buildTestMail(type);
    await transporter.sendMail({ from, subject: message.subject, text: message.text, to: recipient });
  }
}

function buildTestMail(type: TestMailType): { subject: string; text: string } {
  if (type === "WORKER_FAILURE") {
    return {
      subject: "[Ridebook] Test - Échec carte définitif",
      text: [
        "Ceci est un email de test Ridebook.",
        "",
        "Type: défaillance définitive du worker Google Maps.",
        "Balade: Balade de démonstration (test-trip-id)",
        "Job: test-job-id",
        "Tentatives: 3/3",
        "URL navigateur: https://www.google.com/maps",
        `Date: ${new Date().toISOString()}`,
        "Erreur: Exemple de défaillance Selenium pour vérifier la réception des notifications.",
        "Capture: indisponible",
      ].join("\n"),
    };
  }

  throw new Error("Unsupported test mail type.");
}
