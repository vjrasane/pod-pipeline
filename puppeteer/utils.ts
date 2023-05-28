import { ElementHandle, Page } from "puppeteer";
import { sleep } from "../utils";

const { waitForSelectors, scrollIntoViewIfNeeded } = require("./helpers.js");

export const findByText = async (
  page: Page,
  text: string
): Promise<ElementHandle<Element> | null> => {
  const timeout = 3000;
  page.setDefaultTimeout(timeout);

  return page.$(`text/${text}`);
};

export const clickByText = async (page: Page, text: string): Promise<void> => {
  const timeout = 2000;
  const selector = `text/${text}`;

  const element = await page.waitForSelector(selector, {
    timeout,
    visible: true,
  });
  if (!element) {
    return await page.click(selector);
  }
  await element.click();
};

export const input = async (
  page: Page,
  selector: string,
  text: string,
  delay: number = 0
) => {
  await page.waitForSelector(selector, {
    visible: true,
  });
  await sleep(delay);
  await page.type(selector, text, {
    delay: 10,
  });
};

export const click = async (page: Page, selector: string) => {
  await page.waitForSelector(selector, { visible: true });
  await page.click(selector);
};

export const select = async (page: Page, selector: string, value: string) => {
  await page.waitForSelector(selector, { visible: true });
  await page.select(selector, value);
};

export const containsTextSelector = (element: string, text: string) =>
  `::-p-xpath(//${element}[contains(text(), "${text}")])`;

export const retryWithWorkaround = async <T>(
  action: () => Promise<T>,
  workaround: () => Promise<unknown>,
  retries: number = 3
): Promise<T> => {
  try {
    const result = await action();
    return result;
  } catch (err) {
    if (retries <= 0) throw err;
    await suppress(workaround());
    return await retryWithWorkaround(action, workaround, retries - 1);
  }
};

export const retryWithDelay = async <T>(
  action: () => Promise<T>,
  delay: number = 1000,
  retries: number = 3
): Promise<T> => retryWithWorkaround(action, () => sleep(delay), retries);

export const suppress = async <T>(
  promise: Promise<T> | (() => Promise<T>)
): Promise<void> => {
  try {
    if (typeof promise === "function") {
      await promise();
      return;
    }
    await promise;
    return;
  } catch (err) {
    // suppress error
  }
};

export const waitPageContains = (page: Page, text: string, timeout = 10000) =>
  page.waitForFunction(
    `document.querySelector("body").innerText.includes("${text}")`,
    { timeout }
  );

export const waitPageNotContains = (
  page: Page,
  text: string,
  timeout = 10000
) =>
  page.waitForFunction(
    `!document.querySelector("body").innerText.includes("${text}")`,
    { timeout }
  );
