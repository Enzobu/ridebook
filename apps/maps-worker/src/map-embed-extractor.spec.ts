import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { BrowserElement, BrowserLocator, BrowserSession } from "./browser-session.js";
import {
  extractEmbedUrl,
  FakeMapEmbedExtractor,
  parseRouteKeyPoints,
  parseRouteMetrics,
  SeleniumMapEmbedExtractor,
} from "./map-embed-extractor.js";

describe("FakeMapEmbedExtractor", () => {
  it("should return a valid configured extraction", async () => {
    const extractor = new FakeMapEmbedExtractor("https://www.google.com/maps/embed?pb=fake", {
      distanceKm: 142.6,
      durationMinutes: 128,
    });

    await expect(extractor.extract("https://maps.app.goo.gl/fake")).resolves.toEqual({
      distanceKm: 142.6,
      durationMinutes: 128,
      mapEmbedUrl: "https://www.google.com/maps/embed?pb=fake",
    });
  });
});

describe("extractEmbedUrl", () => {
  it("should extract the iframe source URL", () => {
    const result = extractEmbedUrl(
      '<iframe src="https://www.google.com/maps/embed?pb=fake" width="600"></iframe>',
    );

    expect(result).toBe("https://www.google.com/maps/embed?pb=fake");
  });
});

describe("parseRouteMetrics", () => {
  it("should parse french distance and duration", () => {
    expect(parseRouteMetrics("2 h 08 min\n142,6 km")).toEqual({
      distanceKm: 142.6,
      durationMinutes: 128,
    });
  });

  it("should parse a minutes-only duration", () => {
    expect(parseRouteMetrics("48 min · 63.4 km")).toEqual({
      distanceKm: 63.4,
      durationMinutes: 48,
    });
  });
});

describe("parseRouteKeyPoints", () => {
  it("should keep standalone localities and destinations from directions", () => {
    expect(
      parseRouteKeyPoints([
        "Saint-Clément-de-Rivière\nPrendre la D986 en direction de Laroque\n12,4 km",
        "Laroque\nContinuer vers Saint-Guilhem-le-Désert\nD4",
        "Saint-Guilhem-le-Désert\nSuivre la route en direction d’Aniane",
        "Aniane\nSaint-Clément-de-Rivière",
      ]),
    ).toEqual([
      "Saint-Clément-de-Rivière",
      "Laroque",
      "Saint-Guilhem-le-Désert",
      "Aniane",
      "Saint-Clément-de-Rivière",
    ]);
  });
});

describe("SeleniumMapEmbedExtractor", () => {
  let tmpPath: string | undefined;

  afterEach(async () => {
    if (tmpPath) {
      await rm(tmpPath, { force: true, recursive: true });
      tmpPath = undefined;
    }
  });

  it("should extract embed URL, distance and duration from a browser session", async () => {
    const session = new FakeBrowserSession(
      [new FakeBrowserElement(""), new FakeBrowserElement(""), new FakeBrowserElement("")],
      [new FakeBrowserElement('<iframe src="https://www.google.com/maps/embed?pb=fake"></iframe>')],
      [new FakeBrowserElement("1 h 37 min\n118,4 km")],
    );
    const extractor = new SeleniumMapEmbedExtractor({
      binaryPath: "/usr/bin/chromium",
      createSession: async () => session,
      headless: true,
      screenshotDir: "/tmp",
      timeoutMs: 1,
    });

    await expect(extractor.extract("https://maps.app.goo.gl/fake")).resolves.toEqual({
      distanceKm: 118.4,
      durationMinutes: 97,
      mapEmbedUrl: "https://www.google.com/maps/embed?pb=fake",
      routeKeyPoints: [],
    });
    expect(session.quitCalled).toBe(true);
  });

  it("should continue when route metrics are unavailable", async () => {
    const session = new FakeBrowserSession(
      [new FakeBrowserElement(""), new FakeBrowserElement(""), new FakeBrowserElement("")],
      [new FakeBrowserElement('<iframe src="https://www.google.com/maps/embed?pb=fake"></iframe>')],
      [],
    );
    const extractor = new SeleniumMapEmbedExtractor({
      binaryPath: "/usr/bin/chromium",
      createSession: async () => session,
      headless: true,
      screenshotDir: "/tmp",
      timeoutMs: 1,
    });

    await expect(extractor.extract("https://maps.app.goo.gl/fake")).resolves.toEqual({
      distanceKm: null,
      durationMinutes: null,
      mapEmbedUrl: "https://www.google.com/maps/embed?pb=fake",
      routeKeyPoints: [],
    });
  });

  it("should store a screenshot diagnostic when the iframe is missing", async () => {
    tmpPath = await mkdtemp(join(tmpdir(), "ridebook-selenium-"));
    const session = new FakeBrowserSession(
      [new FakeBrowserElement(""), new FakeBrowserElement(""), new FakeBrowserElement("")],
      [],
      [],
    );
    const extractor = new SeleniumMapEmbedExtractor({
      binaryPath: "/usr/bin/chromium",
      createSession: async () => session,
      headless: true,
      screenshotDir: tmpPath,
      timeoutMs: 1,
    });

    await expect(extractor.extract("https://maps.app.goo.gl/fake")).rejects.toThrow(
      "Iframe Google Maps embed introuvable.",
    );

    const metadataFile = (await readdir(tmpPath)).find((fileName) => fileName.endsWith(".json"));
    expect(metadataFile).toBeDefined();

    const metadata = await readFile(join(tmpPath, metadataFile ?? ""), "utf8");
    expect(metadata).toContain("Iframe Google Maps embed introuvable.");
    expect(session.quitCalled).toBe(true);
  });
});

class FakeBrowserElement implements BrowserElement {
  constructor(private readonly value: string) {}

  async click(): Promise<void> {
    return;
  }

  async getAttribute(name: string): Promise<string | null> {
    return name === "value" ? this.value : null;
  }

  async getText(): Promise<string> {
    return this.value;
  }
}

class FakeBrowserSession implements BrowserSession {
  quitCalled = false;

  constructor(
    private readonly clickableElements: BrowserElement[],
    private readonly embedElements: BrowserElement[],
    private readonly routeElements: BrowserElement[],
  ) {}

  async get(_url: string): Promise<void> {
    return;
  }

  async waitForElement(locators: BrowserLocator[], _timeoutMs: number): Promise<BrowserElement> {
    if (locators.some((locator) => locator.value.includes("Détails") || locator.value.includes("Details"))) {
      throw new Error("Élément Google Maps introuvable.");
    }

    const element = this.clickableElements.shift();
    if (!element) {
      throw new Error("Élément Google Maps introuvable.");
    }

    return element;
  }

  async findElements(locators: BrowserLocator[]): Promise<BrowserElement[]> {
    if (locators.some((locator) => locator.value.includes("data-trip-index"))) {
      return this.routeElements;
    }

    if (locators.some((locator) => locator.value.includes("data-step-index") || locator.value.includes("directions-mode-step"))) {
      return [];
    }

    return this.embedElements;
  }

  async getCurrentUrl(): Promise<string> {
    return "https://example.com";
  }

  async getTitle(): Promise<string> {
    return "Google Maps";
  }

  async takeScreenshot(): Promise<string> {
    return Buffer.from("png").toString("base64");
  }

  async quit(): Promise<void> {
    this.quitCalled = true;
  }
}
