import puppeteer from "puppeteer-extra";
import { Page } from "puppeteer";

import StealthPlugin from "puppeteer-extra-plugin-stealth";
import AdblockerPlugin from "puppeteer-extra-plugin-stealth";
import { join, resolve } from "path";
import { AdobeConfig, Config } from "../config";
import { writeCsv } from "./csv";
import { capitalize } from "lodash/fp";
import {
  FileDescriptor,
  getFileDescriptor,
  getTaggedFileName,
  setFileExtension,
} from "../utils";
import Semaphore from "semaphore-promise";

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin());

const SIGNIN_BUTTON = 'a[data-t="header-signin-button"]';
const USERNAME_INPUT = 'input[name="username"]';
// const USERNAME_CONTINUE_BUTTON = 'button[data-id="EmailPage-ContinueButton"]';
const PASSWORD_INPUT = 'input[name="password"]';
// const PASSWORD_CONTINUE_BUTTON =
//   'button[data-id="PasswordPage-ContinueButton"]';

const UPLOAD_BUTTON = 'a[data-t="upload-file-tab"]';
const UPLOADED_FILES_LINK =
  '::-p-xpath(//span[contains(text(), "Uploaded Files")])';
const IN_REVIEW_TAB = '::-p-xpath(//span[contains(text(), "In review")])';
const BROWSE_BUTTON = "button.js-upload-filepicker";
const UPLOAD_CSV_BUTTON = 'div[data-t="edit-menu-upload-csv"]';
const CHOOSE_CSV_FILE_BUTTON = 'label[data-t="csv-modal-choose-button"]';
const UPLOAD_CSV_FILE_BUTTON = 'button[data-t="csv-modal-upload"]';
const DELETE_BUTTON = 'button[aria-label="Delete asset button"]';
const CONFIRM_DELETE_BUTTON =
  '::-p-xpath(//span[contains(text(), "Confirm and Delete")])';
const UPLOADED_IMAGE_TILE = "div.upload-tile";
const SUBMIT_FILES_BUTTON = 'button[data-t="submit-moderation-button"]';
const SUBMIT_BUTTON = 'button[data-t="send-moderation-button"]';

const SUBMISSON_MESSAGE =
  '::-p-xpath(//span[contains(text(), "Thank you for your submission")])';

const ADD_ALL_TAGS = 'button[data-t="content-keywords-add-all-suggestions"]';

const FILE_TYPE_SELECT = 'select[aria-label="File type"]';
const ILLUSTRATIONS_FILE_TYPE = "2";

const CONTINUE_BUTTON = '::-p-xpath(//span[contains(text(), "Continue")])';
const REFRESH_BUTTON =
  '::-p-xpath(//span[contains(text(), "Refresh to view changes")])';
const AI_CONTENT_CHECKBOX =
  'input[data-t="content-tagger-generative-ai-checkbox"]';
const AUTO_CATEGORY_BUTTON =
  '::-p-xpath(//span[contains(text(), "Refresh auto-category")])';
const SELECT_ALL_BUTTON = '::-p-xpath(//span[contains(text(), "Select All")])';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const input = async (
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

const click = async (page: Page, selector: string) => {
  await page.waitForSelector(selector, { visible: true });
  await page.click(selector);
};

const select = async (page: Page, selector: string, value: string) => {
  await page.waitForSelector(selector, { visible: true });
  await page.select(selector, value);
};

const deleteFiles = async (page: Page): Promise<void> => {
  const images = await page.$$(UPLOADED_IMAGE_TILE);
  if (images.length <= 0) return;
  await click(page, DELETE_BUTTON);
  await click(page, CONFIRM_DELETE_BUTTON);
  await sleep(1000);
  await deleteFiles(page);
};

const cleanup = async (page: Page): Promise<void> => {
  try {
    await click(page, UPLOADED_FILES_LINK);
    await page.waitForSelector(IN_REVIEW_TAB);
    await page.waitForSelector(UPLOADED_IMAGE_TILE, {
      visible: true,
      timeout: 3000,
    });
    await deleteFiles(page);
  } catch (err) {
    // cleanup err
  }
};

const clickNotNow = async (page: Page) => {
  try {
    await page.waitForSelector(
      '::-p-xpath(//span[contains(text(), "Not now")])',
      {
        visible: true,
        timeout: 1000,
      }
    );
    await page.click('::-p-xpath(//span[contains(text(), "Not now")])');
  } catch (err) {
    // do nothing
  }
};

const retryWithWorkaround = async (
  action: () => Promise<unknown>,
  workaround: () => Promise<unknown>,
  retries: number = 3
): Promise<void> => {
  try {
    await action();
  } catch (err) {
    console.log(err);
    if (retries <= 0) throw err;
    await workaround();
    await retryWithWorkaround(action, workaround, retries - 1);
  }
};

const retryWithDelay = async (
  action: () => Promise<unknown>,
  delay: number = 1000,
  retries: number = 3
): Promise<void> => retryWithWorkaround(action, () => sleep(delay), retries);

const adobeStockSignin = async (
  page: Page,
  username: string,
  password: string
): Promise<Page> => {
  await page.waitForSelector(SIGNIN_BUTTON, {
    visible: true,
  });

  await page.click(SIGNIN_BUTTON);

  await page.waitForNavigation({
    waitUntil: "networkidle2",
  });

  await retryWithWorkaround(
    async () => {
      await input(page, USERNAME_INPUT, username);
      await click(page, CONTINUE_BUTTON);
    },
    () => clickNotNow(page)
  );

  await retryWithWorkaround(
    async () => {
      await input(page, PASSWORD_INPUT, password);
      await click(page, CONTINUE_BUTTON);
    },
    () => clickNotNow(page)
  );

  return page;
};

const adobeStockUploadImage = async (page: Page, imagePath: string) => {
  await click(page, UPLOAD_BUTTON);
  await page.waitForSelector(BROWSE_BUTTON, { visible: true });
  await retryWithDelay(async () => {
    await sleep(1000);
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser({ timeout: 2000 }),
      click(page, BROWSE_BUTTON),
    ]);
    await fileChooser.accept([imagePath]);
  });
};

const adobeStockUploadCsv = async (page: Page, csvFilePath: string) => {
  await click(page, UPLOAD_CSV_BUTTON);

  await sleep(1000);
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 2000 }),
    click(page, CHOOSE_CSV_FILE_BUTTON),
  ]);
  await fileChooser.accept([csvFilePath]);
  await click(page, UPLOAD_CSV_FILE_BUTTON);
  await page.waitForSelector(REFRESH_BUTTON);
  await click(page, REFRESH_BUTTON);
};

const writeImageMetadata = async (
  title: string,
  keywords: string[],
  category: number,
  imageFile: FileDescriptor
): Promise<string> => {
  const csv = await writeCsv({
    header: (
      ["filename", "title", "keywords", "category", "releases"] as const
    ).map((id) => ({ id, title: capitalize(id) })),
    records: [
      {
        filename: imageFile.base,
        title,
        keywords,
        category,
        releases: [],
      },
    ],
    output: join(
      imageFile.dir,
      getTaggedFileName(
        setFileExtension(imageFile.base, "csv"),
        "adobe-stock-metadata"
      )
    ),
  });

  return csv;
};

type AdobeUploadParameters = {
  image: string;
  title: string;
  category: number;
  keywords: string[];
};

const semaphore = new Semaphore(1);

export async function* adobeStockUpload(
  { image, title, category, keywords }: AdobeUploadParameters,
  { adobeStockPassword, adobeStockUsername, workDir }: AdobeConfig & Config
): AsyncIterable<string> {
  const release = await semaphore.acquire();
  const browser = await puppeteer.launch({ headless: false });
  try {
    const page = await browser.newPage();
    await page.goto("https://contributor.stock.adobe.com/");

    const imagePath = resolve(workDir, image);
    await adobeStockSignin(page, adobeStockUsername, adobeStockPassword);

    yield "Signed in to Adobe Stock";

    await cleanup(page);

    await adobeStockUploadImage(page, imagePath);

    yield "Uploaded image to Adobe Stock";

    const imageFile = getFileDescriptor(imagePath);
    const csvPath = await writeImageMetadata(
      title,
      keywords,
      category,
      imageFile
    );
    await adobeStockUploadCsv(page, csvPath);

    yield "Uploaded CSV to Adobe Stock";

    await click(page, AI_CONTENT_CHECKBOX);
    await select(page, FILE_TYPE_SELECT, ILLUSTRATIONS_FILE_TYPE);

    await retryWithDelay(async () => {
      await click(page, SUBMIT_FILES_BUTTON);
      await page.waitForSelector(SUBMIT_BUTTON);
    });

    await retryWithDelay(async () => {
      await click(page, SUBMIT_BUTTON);
      await page.waitForSelector(SUBMISSON_MESSAGE);
    });

    yield "Submitted image to Adobe Stock";
    return;
  } finally {
    await browser.close();
    release();
  }
}
