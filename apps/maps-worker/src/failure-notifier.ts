import { access } from "node:fs/promises";
import nodemailer, { Transporter } from "nodemailer";

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
    this.transporter = nodemailer.createTransport({
      auth: options.user ? { pass: options.password, user: options.user } : undefined,
      host: options.host,
      port: options.port,
      secure: options.secure,
    });
  }

  async notify(notification: MapFailureNotification): Promise<void> {
    const screenshotPath = extractScreenshotPath(notification.lastError);
    const attachments = screenshotPath && (await exists(screenshotPath))
      ? [{ filename: "selenium-diagnostic.png", path: screenshotPath }]
      : [];

    await this.transporter.sendMail({
      attachments,
      from: this.options.from,
      subject: `[Ridebook] Échec carte définitif - ${notification.tripName}`,
      text: buildFailureEmailText(notification, screenshotPath),
      to: this.options.to,
    });
  }
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

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
