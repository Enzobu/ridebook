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
  it("should parse localities from a full Google Maps details panel", () => {
    const panelText = [
      "2 h 3 min (105 km)",
      "via D986",
      "43.6554549, 3.8379278",
      "Prendre Rte de Ganges/D986 et quitter Imp. Cabernet et D127E3",
      "34 min (37,6 km)",
      "D986",
      "34190 Laroque",
      "Prendre à gauche sur Av. des Combattants/D4 (panneaux vers Ceilhes/Brissac)",
      "Au rond-point, prendre la 3e sortie sur Rte de Brissac/D4",
      "Prendre à gauche sur D27 (panneaux vers Aniane/Gignac)",
      "Rester sur la voie de droite pour continuer sur Av. de Saint-Guilhem/D27",
      "43.6606328, 3.6563196",
      "Suivre D111 en direction de Lot. Pascal à Montarnaud",
      "Continuer sur D27E1. Rouler en direction de M102 à Grabels",
      "Prendre M102 et M127E3 en direction de Imp. Cabernet à Saint-Clément-de-Rivière",
      "43.6554541, 3.8380376",
    ].join("\n");

    expect(parseRouteKeyPoints([panelText])).toEqual([
      "Laroque",
      "Brissac",
      "Aniane",
      "Saint-Guilhem",
      "Montarnaud",
      "Saint-Clément-de-Rivière",
    ]);
  });

  it("should keep a named loop closure", () => {
    expect(
      parseRouteKeyPoints([
        "175 Mnt du Morastel\n34980 Saint-Clément-de-Rivière\nContinuer en direction de Bédarieux\n34600 Bédarieux\n175 Mnt du Morastel\n34980 Saint-Clément-de-Rivière",
      ]),
    ).toEqual(["Saint-Clément-de-Rivière", "Bédarieux", "Saint-Clément-de-Rivière"]);
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

  it("should extract embed URL, metrics and route points from a browser session", async () => {
    const session = new FakeBrowserSession(
      [new FakeBrowserElement(""), new FakeBrowserElement(""), new FakeBrowserElement("")],
      [new FakeBrowserElement('<iframe src="https://www.google.com/maps/embed?pb=fake"></iframe>')],
      [new FakeBrowserElement("1 h 37 min\n118,4 km")],
      [
        new FakeBrowserElement(
          "34190 Laroque\nPrendre à gauche sur D27 (panneaux vers Aniane/Gignac)\nContinuer sur Av. de Saint-Guilhem/D27\nSuivre D111 en direction de Lot. Pascal à Montarnaud\nRouler en direction de M102 à Grabels\nPrendre M102 en direction de Imp. Cabernet à Saint-Clément-de-Rivière",
        ),
      ],
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
      routeKeyPoints: ["Laroque", "Aniane", "Gignac", "Saint-Guilhem", "Montarnaud", "Saint-Clément-de-Rivière"],
    });
    expect(session.quitCalled).toBe(true);
  });

  it("should continue when route metrics and route points are unavailable", async () => {
    const session = new FakeBrowserSession(
      [new FakeBrowserElement(""), new FakeBrowserElement(""), new FakeBrowserElement("")],
      [new FakeBrowserElement('<iframe src="https://www.google.com/maps/embed?pb=fake"></iframe>')],
      [],
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
    private readonly detailsElements: BrowserElement[],
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

    if (locators.some((locator) => locator.value.includes("role='main'") || locator.value.includes("role=\"main\"") || locator.value.includes("aria-label, 'Itinéraire'"))) {
      return this.detailsElements;
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
