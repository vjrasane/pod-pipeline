import { ElementHandle, Page } from "puppeteer";

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
  const selectors = [[`aria/${text}`], [`text/${text}`]];

  await scrollIntoViewIfNeeded(selectors, page, timeout);
  const element = await waitForSelectors(selectors, page, {
    timeout,
    visible: true,
  });
  await element.click();
};
