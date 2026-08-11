import { access } from "node:fs/promises";
import nodemailer, { Transporter } from "nodemailer";

import { buildRidebookEmailHtml, escapeHtml } from "./email-template.js";

export interface MapFailureNotification {
  attempts: number;
  failedAt: Date;
  googleMapsUrl: string;
  jobId: string;
  lastError: string;
  maxAttempts: number;
  tripId: string;
  tripName: string;
}

export interface FailureNotifier {
  notify(notification: MapFailureNotification): Promise<void>;
}

export interface SmtpFailureNotifierOptions {
  from: string;
  host: string;
  password: string;
  port: number;
  secure: boolean;
  to: string;
  user: string;
}

export class DisabledFailureNotifier implements FailureNotifier {
  async notify(_notification: MapFailureNotification): Promise<void> {
    return;
  }
}

export class SmtpFailureNotifier implements FailureNotifier {
  private readonly transporter: Transporter;

  constructor(private readonly options: SmtpFailureNotifierOptions) {
    this.transporter = createTransporter(options);
  }

  async notify(notification: MapFailureNotification): Promise<void> {
    const screenshotPath = extractScreenshotPath(notification.lastError);
    const attachments = screenshotPath && (await exists(screenshotPath))
      ? [{ filename: "selenium-diagnostic.png", path: screenshotPath }]
      : [];

    await this.transporter.sendMail({
      attachments,
      from: this.options.from,
      html: buildRidebookEmailHtml({
        bodyHtml: [
          `<strong>Balade :</strong> ${escapeHtml(notification.tripName)}<br>`,
          `<strong>Tentatives :</strong> ${notification.attempts}/${notification.maxAttempts}<br>`,
          `<strong>Date :</strong> ${escapeHtml(notification.failedAt.toISOString())}<br>`,
          `<strong>Erreur :</strong> ${escapeHtml(notification.lastError)}`,
        ].join(""),
        eyebrow: "Alerte worker",
        intro: "La récupération de la carte Google Maps a échoué définitivement.",
        title: "Échec de récupération d'une carte",
      }),
      subject: `[Ridebook] Échec carte définitif - ${notification.tripName}`,
      text: buildFailureEmailText(notification, screenshotPath),
      to: this.options.to,
    });
  }
}

export async function sendInvitationEmail(
  options: Omit<SmtpFailureNotifierOptions, "to">,
  recipient: string,
  invitationUrl: string,
): Promise<void> {
  const transporter = createTransporter({ ...options, to: recipient });

  await transporter.sendMail({
    from: options.from,
    html: buildRidebookEmailHtml({
      actionHref: invitationUrl,
      actionLabel: "Créer mon compte",
      bodyHtml: "Ce lien est personnel, utilisable une seule fois et expire dans 1 heure.",
      eyebrow: "Invitation",
      intro: "Tu as été invité à rejoindre Ridebook. Clique sur le bouton ci-dessous pour choisir ton mot de passe et créer ton compte.",
      title: "Bienvenue sur Ridebook",
    }),
    subject: "[Ridebook] Crée ton compte",
    text: [
      "Tu as été invité à rejoindre Ridebook.",
      "",
      `Créer mon compte : ${invitationUrl}`,
      "",
      "Ce lien est personnel, utilisable une seule fois et expire dans 1 heure.",
    ].join("\n"),
    to: recipient,
  });
}

export function buildFailureEmailText(notification: MapFailureNotification, screenshotPath?: string): string {
  return [
    "La récupération Google Maps a échoué définitivement.",
    "",
    `Balade: ${notification.tripName} (${notification.tripId})`,
    `Job: ${notification.jobId}`,
    `Tentatives: ${notification.attempts}/${notification.maxAttempts}`,
    `URL navigateur: ${notification.googleMapsUrl}`,
    `Date: ${notification.failedAt.toISOString()}`,
    `Erreur: ${notification.lastError}`,
    screenshotPath ? `Capture: ${screenshotPath}` : "Capture: indisponible",
  ].join("\n");
}

export function extractScreenshotPath(lastError: string): string | undefined {
  return lastError.match(/Diagnostic: (?<path>\/[^ ]+\.png)/u)?.groups?.["path"];
}

function createTransporter(options: Omit<SmtpFailureNotifierOptions, "to"> | SmtpFailureNotifierOptions): Transporter {
  return nodemailer.createTransport({
    auth: options.user ? { pass: options.password, user: options.user } : undefined,
    host: options.host,
    port: options.port,
    secure: options.secure,
  });
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
