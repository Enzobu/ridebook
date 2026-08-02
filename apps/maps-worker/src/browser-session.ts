import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Browser, Builder, By, until, WebDriver } from "selenium-webdriver";
import { Options } from "selenium-webdriver/chrome";

export type BrowserLocator = {
  type: "css" | "xpath";
  value: string;
};

export interface BrowserElement {
  click(): Promise<void>;
  getAttribute(name: string): Promise<string | null>;
  getText(): Promise<string>;
}

export interface BrowserSession {
  get(url: string): Promise<void>;
  waitForElement(locators: BrowserLocator[], timeoutMs: number): Promise<BrowserElement>;
  findElements(locators: BrowserLocator[]): Promise<BrowserElement[]>;
  getCurrentUrl(): Promise<string>;
  getTitle(): Promise<string>;
  takeScreenshot(): Promise<string>;
  quit(): Promise<void>;
}

export interface SeleniumBrowserOptions {
  binaryPath: string;
  headless: boolean;
}

export async function createSeleniumBrowserSession(
  options: SeleniumBrowserOptions,
): Promise<BrowserSession> {
  const chromeOptions = new Options();
  chromeOptions.setChromeBinaryPath(options.binaryPath);
  chromeOptions.addArguments("--disable-dev-shm-usage", "--disable-gpu", "--no-sandbox", "--window-size=1440,1100");

  if (options.headless) {
    chromeOptions.addArguments("--headless=new");
  }

  const driver = await new Builder().forBrowser(Browser.CHROME).setChromeOptions(chromeOptions).build();
  return new SeleniumBrowserSession(driver);
}

export async function saveScreenshot(
  screenshotDir: string,
  base64Screenshot: string,
  diagnostic: Record<string, string>,
): Promise<string> {
  const now = new Date().toISOString().replaceAll(":", "-");
  const basePath = join(screenshotDir, `maps-extraction-${now}`);
  const screenshotPath = `${basePath}.png`;
  const metadataPath = `${basePath}.json`;

  await mkdir(dirname(screenshotPath), { recursive: true });
  await writeFile(screenshotPath, Buffer.from(base64Screenshot, "base64"));
  await writeFile(metadataPath, JSON.stringify(diagnostic, null, 2));

  return screenshotPath;
}

class SeleniumBrowserSession implements BrowserSession {
  constructor(private readonly driver: WebDriver) {}

  async get(url: string): Promise<void> {
    await this.driver.get(url);
  }

  async waitForElement(locators: BrowserLocator[], timeoutMs: number): Promise<BrowserElement> {
    const deadline = Date.now() + timeoutMs;

    for (const locator of locators) {
      const remainingMs = Math.max(deadline - Date.now(), 1);

      try {
        return await this.driver.wait(until.elementLocated(toBy(locator)), remainingMs);
      } catch {
        continue;
      }
    }

    throw new Error("Élément Google Maps introuvable.");
  }

  async findElements(locators: BrowserLocator[]): Promise<BrowserElement[]> {
    const nestedElements = await Promise.all(
      locators.map(async (locator) => this.driver.findElements(toBy(locator))),
    );

    return nestedElements.flat();
  }

  async getCurrentUrl(): Promise<string> {
    return this.driver.getCurrentUrl();
  }

  async getTitle(): Promise<string> {
    return this.driver.getTitle();
  }

  async takeScreenshot(): Promise<string> {
    return this.driver.takeScreenshot();
  }

  async quit(): Promise<void> {
    await this.driver.quit();
  }
}

function toBy(locator: BrowserLocator): By {
  return locator.type === "css" ? By.css(locator.value) : By.xpath(locator.value);
}
