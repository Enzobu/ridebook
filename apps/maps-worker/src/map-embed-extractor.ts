import { BrowserLocator, BrowserSession, createSeleniumBrowserSession, saveScreenshot } from "./browser-session.js";
import { assertValidGoogleMapsEmbedUrl } from "./embed-url-validator.js";

export interface MapExtractionResult {
  distanceKm: number | null;
  durationMinutes: number | null;
  mapEmbedUrl: string;
}

export interface MapEmbedExtractor {
  extract(googleMapsUrl: string): Promise<MapExtractionResult>;
}

export class FakeMapEmbedExtractor implements MapEmbedExtractor {
  constructor(
    private readonly embedUrl: string,
    private readonly metrics: Pick<MapExtractionResult, "distanceKm" | "durationMinutes"> = {
      distanceKm: null,
      durationMinutes: null,
    },
  ) {}

  async extract(_googleMapsUrl: string): Promise<MapExtractionResult> {
    return {
      ...this.metrics,
      mapEmbedUrl: assertValidGoogleMapsEmbedUrl(this.embedUrl),
    };
  }
}

export interface SeleniumMapEmbedExtractorOptions {
  binaryPath: string;
  headless: boolean;
  screenshotDir: string;
  timeoutMs: number;
  createSession?: () => Promise<BrowserSession>;
}

const CONSENT_BUTTON_LOCATORS: BrowserLocator[] = [
  { type: "xpath", value: "//button[.//*[contains(text(),'Tout accepter')]]" },
  { type: "xpath", value: "//button[contains(., 'Tout accepter')]" },
  { type: "xpath", value: "//button[contains(., 'Accept all')]" },
  { type: "css", value: "button[aria-label*='Accept']" },
  { type: "css", value: "button[aria-label*='accepter']" },
];

const SHARE_BUTTON_LOCATORS: BrowserLocator[] = [
  { type: "css", value: "button[aria-label*='Partager']" },
  { type: "css", value: "button[aria-label*='Share']" },
  { type: "xpath", value: "//*[@role='button' and contains(@aria-label, 'Partager')]" },
  { type: "xpath", value: "//*[@role='button' and contains(@aria-label, 'Share')]" },
  { type: "xpath", value: "//button[contains(., 'Partager')]" },
  { type: "xpath", value: "//button[contains(., 'Share')]" },
];

const ROUTE_DETAILS_LOCATORS: BrowserLocator[] = [
  { type: "xpath", value: "//*[self::button or self::a][contains(., 'Détails')]" },
  { type: "xpath", value: "//*[self::button or self::a][contains(., 'Details')]" },
];

const ROUTE_SUMMARY_LOCATORS: BrowserLocator[] = [
  { type: "css", value: "[data-trip-index]" },
  { type: "xpath", value: "//*[@data-trip-index]" },
];

const EMBED_TAB_LOCATORS: BrowserLocator[] = [
  { type: "xpath", value: "//*[@role='tab' and contains(., 'Intégrer une carte')]" },
  { type: "xpath", value: "//*[@role='tab' and contains(., 'Embed a map')]" },
  { type: "xpath", value: "//*[self::button or self::a][contains(., 'Intégrer une carte')]" },
  { type: "xpath", value: "//*[self::button or self::a][contains(., 'Embed a map')]" },
  { type: "css", value: "[data-value='embedmap']" },
];

const EMBED_VALUE_LOCATORS: BrowserLocator[] = [
  { type: "css", value: "input[value*='/maps/embed']" },
  { type: "css", value: "textarea" },
  { type: "css", value: "iframe[src*='/maps/embed']" },
];

export class SeleniumMapEmbedExtractor implements MapEmbedExtractor {
  private readonly createSession: () => Promise<BrowserSession>;

  constructor(private readonly options: SeleniumMapEmbedExtractorOptions) {
    this.createSession =
      options.createSession ??
      (() => createSeleniumBrowserSession({ binaryPath: options.binaryPath, headless: options.headless }));
  }

  async extract(googleMapsUrl: string): Promise<MapExtractionResult> {
    const session = await this.createSession();

    try {
      await session.get(googleMapsUrl);
      await this.clickOptional(session, CONSENT_BUTTON_LOCATORS);
      const metrics = await this.readRouteMetrics(session);
      await this.clickOptional(session, ROUTE_DETAILS_LOCATORS);
      await this.clickRequired(session, SHARE_BUTTON_LOCATORS);
      await this.clickRequired(session, EMBED_TAB_LOCATORS);

      const rawEmbedValue = await this.readEmbedValue(session);
      return {
        ...metrics,
        mapEmbedUrl: assertValidGoogleMapsEmbedUrl(extractEmbedUrl(rawEmbedValue)),
      };
    } catch (error) {
      throw await this.withDiagnostic(session, error);
    } finally {
      await session.quit();
    }
  }

  private async clickOptional(session: BrowserSession, locators: BrowserLocator[]): Promise<void> {
    try {
      await this.clickRequired(session, locators);
    } catch {
      return;
    }
  }

  private async clickRequired(session: BrowserSession, locators: BrowserLocator[]): Promise<void> {
    const element = await session.waitForElement(locators, this.options.timeoutMs);
    await element.click();
  }

  private async readRouteMetrics(session: BrowserSession): Promise<Pick<MapExtractionResult, "distanceKm" | "durationMinutes">> {
    const routeElements = await session.findElements(ROUTE_SUMMARY_LOCATORS);

    for (const element of routeElements) {
      const metrics = parseRouteMetrics(await element.getText());
      if (metrics.distanceKm !== null || metrics.durationMinutes !== null) {
        return metrics;
      }
    }

    return { distanceKm: null, durationMinutes: null };
  }

  private async readEmbedValue(session: BrowserSession): Promise<string> {
    const elements = await session.findElements(EMBED_VALUE_LOCATORS);

    for (const element of elements) {
      const value = (await element.getAttribute("value")) ?? "";
      const src = (await element.getAttribute("src")) ?? "";
      const text = await element.getText();
      const rawValue = value || src || text;

      if (rawValue.includes("/maps/embed")) {
        return rawValue;
      }
    }

    throw new Error("Iframe Google Maps embed introuvable.");
  }

  private async withDiagnostic(session: BrowserSession, error: unknown): Promise<Error> {
    const message = error instanceof Error ? error.message : "Erreur Selenium inconnue.";
    const [currentUrl, title, screenshot] = await Promise.all([
      session.getCurrentUrl().catch(() => "unknown"),
      session.getTitle().catch(() => "unknown"),
      session.takeScreenshot().catch(() => ""),
    ]);
    const screenshotPath = screenshot
      ? await saveScreenshot(this.options.screenshotDir, screenshot, { currentUrl, title, error: message })
      : "capture indisponible";

    return new Error(`Extraction Google Maps impossible: ${message}. Diagnostic: ${screenshotPath}`);
  }
}

export function extractEmbedUrl(rawValue: string): string {
  const iframeMatch = rawValue.match(/src=["'](?<src>https:\/\/[^"']+)["']/u);

  if (iframeMatch?.groups?.["src"]) {
    return iframeMatch.groups["src"];
  }

  return rawValue.trim();
}

export function parseRouteMetrics(text: string): Pick<MapExtractionResult, "distanceKm" | "durationMinutes"> {
  const normalizedText = text.replaceAll("\u00a0", " ");
  const distanceMatch = normalizedText.match(/(?<distance>\d+(?:[.,]\d+)?)\s*km\b/iu);
  const hoursMatch = normalizedText.match(/(?<hours>\d+)\s*(?:h|hr|hrs|hour|hours)\b/iu);
  const minutesMatch = normalizedText.match(/(?<minutes>\d+)\s*(?:min|mins|minute|minutes)\b/iu);

  const distanceKm = distanceMatch?.groups?.["distance"]
    ? Number(distanceMatch.groups["distance"].replace(",", "."))
    : null;
  const hours = hoursMatch?.groups?.["hours"] ? Number(hoursMatch.groups["hours"]) : 0;
  const minutes = minutesMatch?.groups?.["minutes"] ? Number(minutesMatch.groups["minutes"]) : 0;
  const durationMinutes = hoursMatch || minutesMatch ? hours * 60 + minutes : null;

  return { distanceKm, durationMinutes };
}
