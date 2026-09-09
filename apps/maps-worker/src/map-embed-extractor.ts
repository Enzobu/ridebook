import { BrowserLocator, BrowserSession, createSeleniumBrowserSession, saveScreenshot } from "./browser-session.js";
import { assertValidGoogleMapsEmbedUrl } from "./embed-url-validator.js";

export interface MapExtractionResult {
  distanceKm: number | null;
  durationMinutes: number | null;
  mapEmbedUrl: string;
  routeKeyPoints?: string[];
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

const ROUTE_DETAILS_PANEL_LOCATORS: BrowserLocator[] = [
  { type: "css", value: "div[role='main']" },
  { type: "xpath", value: "//*[@role='main']" },
  { type: "xpath", value: "//*[contains(@aria-label, 'Itinéraire') or contains(@aria-label, 'Directions')]" },
];

const ROUTE_KEY_POINT_FALLBACK_LOCATORS: BrowserLocator[] = [
  { type: "css", value: "[data-step-index]" },
  { type: "css", value: ".directions-mode-step" },
  { type: "xpath", value: "//*[@role='main']//*[self::h1 or self::h2 or self::h3]" },
  { type: "xpath", value: "//*[@role='main']//*[contains(@class, 'directions')]" },
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

const OPTIONAL_CLICK_TIMEOUT_MS = 3_000;
const MAX_ROUTE_KEY_POINTS = 6;

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
      const routeKeyPoints = await this.readRouteKeyPoints(session);
      await this.clickRequired(session, SHARE_BUTTON_LOCATORS);
      await this.clickRequired(session, EMBED_TAB_LOCATORS);

      const rawEmbedValue = await this.readEmbedValue(session);
      return {
        ...metrics,
        mapEmbedUrl: assertValidGoogleMapsEmbedUrl(extractEmbedUrl(rawEmbedValue)),
        routeKeyPoints,
      };
    } catch (error) {
      throw await this.withDiagnostic(session, error);
    } finally {
      await session.quit();
    }
  }

  private async clickOptional(session: BrowserSession, locators: BrowserLocator[]): Promise<void> {
    try {
      const element = await session.waitForElement(
        locators,
        Math.min(this.options.timeoutMs, OPTIONAL_CLICK_TIMEOUT_MS),
      );
      await element.click();
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

  private async readRouteKeyPoints(session: BrowserSession): Promise<string[]> {
    const panelElements = await session.findElements(ROUTE_DETAILS_PANEL_LOCATORS);
    const fallbackElements = panelElements.length === 0
      ? await session.findElements(ROUTE_KEY_POINT_FALLBACK_LOCATORS)
      : [];
    const elements = panelElements.length > 0 ? panelElements : fallbackElements;
    const texts = await Promise.all(elements.map(async (element) => element.getText()));
    return parseRouteKeyPoints(texts);
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

export function parseRouteKeyPoints(texts: string[]): string[] {
  const candidates: string[] = [];

  for (const text of texts) {
    const lines = text
      .replaceAll("\u00a0", " ")
      .split(/\r?\n/u)
      .map((line) => line.replace(/^[•·\-–—]\s*/u, "").trim())
      .filter(Boolean);

    for (const line of lines) {
      if (isCoordinateLine(line) || isMetricLine(line)) {
        continue;
      }

      const postalMatch = line.match(/(?:^|\b)\d{5}\s+(?<place>[\p{L}\p{M}'’ .-]{2,60})$/u);
      if (postalMatch?.groups?.["place"]) {
        addCandidate(candidates, postalMatch.groups["place"]);
      }

      const destinationMatches = line.matchAll(/(?:\bvers\s+|\bdirection\s+(?:de\s+|d['’])|\sà\s+)(?<place>[\p{Lu}À-ÖØ-Þ][\p{L}\p{M}'’ .-]*(?:\/[\p{Lu}À-ÖØ-Þ][\p{L}\p{M}'’ .-]*)?)(?=$|[),.;])/gu);
      for (const match of destinationMatches) {
        const place = match.groups?.["place"];
        if (place) {
          addCandidate(candidates, place);
        }
      }

      const saintStreetMatches = line.matchAll(/\b(?:av\.?|avenue|rte|route|bd|boulevard|chem\.?|chemin)\s+(?:de\s+|du\s+|des\s+|de\s+l['’])(?<place>Saint-[\p{L}\p{M}'’.-]+)/giu);
      for (const match of saintStreetMatches) {
        const place = match.groups?.["place"];
        if (place) {
          addCandidate(candidates, place);
        }
      }

      if (isStandalonePlaceName(line)) {
        addCandidate(candidates, line);
      }
    }
  }

  return selectRouteKeyPoints(compactRoutePoints(candidates), MAX_ROUTE_KEY_POINTS);
}

function isCoordinateLine(value: string): boolean {
  return /^-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+$/u.test(value);
}

function isMetricLine(value: string): boolean {
  return /^\d+(?:[.,]\d+)?\s*(?:m|km|min|h)(?:\s|$)/iu.test(value)
    || /^\d+\s*h\s*\d*\s*min/iu.test(value);
}

function isStandalonePlaceName(value: string): boolean {
  if (value.length < 2 || value.length > 60 || /\d/u.test(value)) {
    return false;
  }

  const normalized = value.toLocaleLowerCase("fr-FR");
  const ignored = [
    "arrivée",
    "départ",
    "détails",
    "details",
    "itinéraire",
    "itineraire",
    "partager",
    "share",
    "plus d'options",
    "plus d’options",
  ];
  if (ignored.includes(normalized)) {
    return false;
  }

  if (/\b(?:tournez|tourner|continuez|continuer|prenez|prendre|suivez|suivre|rejoignez|rejoindre|roulez|rouler|rond-point|sortie|destination|circulation|itinéraire)\b/iu.test(value)) {
    return false;
  }

  if (/^(?:A|D|N|E|M)\s?\d+[A-Z0-9]*$/iu.test(value)) {
    return false;
  }

  return /^[\p{Lu}À-ÖØ-Þ][\p{L}\p{M}'’ .-]+$/u.test(value);
}

function cleanRoutePoint(value: string): string {
  return value
    .replace(/\/(?:A|D|N|E|M)\d+[A-Z0-9]*.*$/iu, "")
    .replace(/\s+(?:via|sur|par)\s+.+$/iu, "")
    .replace(/\s{2,}/gu, " ")
    .trim();
}

function isLikelyPlaceName(value: string): boolean {
  if (value.length < 2 || value.length > 60 || /\d/u.test(value)) {
    return false;
  }

  if (/^(?:imp\.?|lot\.?|av\.?|avenue|rte|route|bd|boulevard|chem\.?|chemin|rés|res)\b/iu.test(value)) {
    return false;
  }

  return /^[\p{Lu}À-ÖØ-Þ][\p{L}\p{M}'’ .-]+$/u.test(value);
}

function addCandidate(points: string[], rawPoint: string): void {
  const splitPoints = rawPoint.split("/");

  for (const splitPoint of splitPoints) {
    const point = cleanRoutePoint(splitPoint);
    if (!isLikelyPlaceName(point)) {
      continue;
    }
    points.push(point);
  }
}

function compactRoutePoints(points: string[]): string[] {
  const compacted: string[] = [];

  for (const point of points) {
    const previous = compacted.at(-1);
    if (previous?.localeCompare(point, "fr", { sensitivity: "base" }) === 0) {
      continue;
    }

    const alreadySeen = compacted.some(
      (existing) => existing.localeCompare(point, "fr", { sensitivity: "base" }) === 0,
    );
    const closesLoop = compacted.length > 1
      && compacted[0]?.localeCompare(point, "fr", { sensitivity: "base" }) === 0;

    if (!alreadySeen || closesLoop) {
      compacted.push(point);
    }
  }

  return compacted;
}

function selectRouteKeyPoints(points: string[], maxPoints: number): string[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const selectedIndexes = new Set<number>();
  for (let index = 0; index < maxPoints; index += 1) {
    selectedIndexes.add(Math.round((index * (points.length - 1)) / (maxPoints - 1)));
  }

  return [...selectedIndexes].sort((left, right) => left - right).map((index) => points[index]!);
}
