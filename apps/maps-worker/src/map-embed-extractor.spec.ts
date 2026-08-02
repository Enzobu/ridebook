import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { BrowserElement, BrowserLocator, BrowserSession } from "./browser-session.js";
import { extractEmbedUrl, FakeMapEmbedExtractor, SeleniumMapEmbedExtractor } from "./map-embed-extractor.js";

describe("FakeMapEmbedExtractor", () => {
  it("should return a valid configured embed URL", async () => {
    const extractor = new FakeMapEmbedExtractor("https://www.google.com/maps/embed?pb=fake");

    await expect(extractor.extract("https://maps.app.goo.gl/fake")).resolves.toBe(
      "https://www.google.com/maps/embed?pb=fake",
    );
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

describe("SeleniumMapEmbedExtractor", () => {
  let tmpPath: string | undefined;

  afterEach(async () => {
    if (tmpPath) {
      await rm(tmpPath, { force: true, recursive: true });
      tmpPath = undefined;
    }
  });

  it("should extract an embed URL from a browser session", async () => {
    const session = new FakeBrowserSession(
      [new FakeBrowserElement(""), new FakeBrowserElement(""), new FakeBrowserElement("")],
      [
        new FakeBrowserElement('<iframe src="https://www.google.com/maps/embed?pb=fake"></iframe>'),
      ],
    );
    const extractor = new SeleniumMapEmbedExtractor({
      binaryPath: "/usr/bin/chromium",
      createSession: async () => session,
      headless: true,
      screenshotDir: "/tmp",
      timeoutMs: 1,
    });

    await expect(extractor.extract("https://maps.app.goo.gl/fake")).resolves.toBe(
      "https://www.google.com/maps/embed?pb=fake",
    );
    expect(session.quitCalled).toBe(true);
  });

  it("should open route details before sharing when the details action is available", async () => {
    const session = new FakeBrowserSession(
      [new FakeBrowserElement(""), new FakeBrowserElement(""), new FakeBrowserElement(""), new FakeBrowserElement("")],
      [new FakeBrowserElement('<iframe src="https://www.google.com/maps/embed?pb=route"></iframe>')],
      "https://example.com",
      true,
    );
    const extractor = new SeleniumMapEmbedExtractor({
      binaryPath: "/usr/bin/chromium",
      createSession: async () => session,
      headless: true,
      screenshotDir: "/tmp",
      timeoutMs: 1,
    });

    await expect(extractor.extract("https://maps.app.goo.gl/route")).resolves.toBe(
      "https://www.google.com/maps/embed?pb=route",
    );

    expect(
      session.waitedLocatorGroups.some((locators) => locators.some((locator) => locator.value.includes("Détails"))),
    ).toBe(true);
  });

  it("should reject a directions URL with an output embed parameter", async () => {
    const session = new FakeBrowserSession(
      [new FakeBrowserElement(""), new FakeBrowserElement(""), new FakeBrowserElement("")],
      [new FakeBrowserElement("https://www.google.com/maps/dir/Paris/Lyon?output=embed")],
    );
    const extractor = new SeleniumMapEmbedExtractor({
      binaryPath: "/usr/bin/chromium",
      createSession: async () => session,
      headless: true,
      screenshotDir: "/tmp",
      timeoutMs: 1,
    });

    await expect(extractor.extract("https://maps.app.goo.gl/fake")).rejects.toThrow(
      "Iframe Google Maps embed introuvable.",
    );
  });

  it("should store a screenshot diagnostic when the iframe is missing", async () => {
    tmpPath = await mkdtemp(join(tmpdir(), "ridebook-selenium-"));
    const session = new FakeBrowserSession(
      [new FakeBrowserElement(""), new FakeBrowserElement(""), new FakeBrowserElement("")],
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
  waitedLocatorGroups: BrowserLocator[][] = [];

  constructor(
    private readonly clickableElements: BrowserElement[],
    private readonly embedElements: BrowserElement[],
    private readonly currentUrl = "https://example.com",
    private readonly routeDetailsAvailable = false,
  ) {}

  async get(_url: string): Promise<void> {
    return;
  }

  async waitForElement(locators: BrowserLocator[], _timeoutMs: number): Promise<BrowserElement> {
    this.waitedLocatorGroups.push(locators);

    if (isRouteDetailsLocatorGroup(locators) && !this.routeDetailsAvailable) {
      throw new Error("Élément Google Maps introuvable.");
    }

    const element = this.clickableElements.shift();

    if (!element) {
      throw new Error("Élément Google Maps introuvable.");
    }

    return element;
  }

  async findElements(_locators: BrowserLocator[]): Promise<BrowserElement[]> {
    return this.embedElements;
  }

  async getCurrentUrl(): Promise<string> {
    return this.currentUrl;
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

function isRouteDetailsLocatorGroup(locators: BrowserLocator[]): boolean {
  return locators.some((locator) => locator.value.includes("Détails") || locator.value.includes("Details"));
}
