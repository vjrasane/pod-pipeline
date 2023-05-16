import StealthPlugin from "puppeteer-extra-plugin-stealth";
import AdblockerPlugin from "puppeteer-extra-plugin-stealth";
import Semaphore from "semaphore-promise";
import { ShutterstockConfig } from "../config";
import puppeteer from "puppeteer-extra";
import { Page } from "puppeteer";
import { join, resolve } from "path";
import {
  FileDescriptor,
  getFileDescriptor,
  getTaggedFileName,
  setFileExtension,
} from "../utils";
import { writeCsv } from "./csv";
import { capitalize } from "lodash/fp";
import { clickByText } from "../puppeteer/utils";
import { ShutterstockCategory } from "../prompts/stock-image";

const _delete = require("../puppeteer/shutterstock/delete");
const refreshNow = require("../puppeteer/shutterstock/refresh-now");

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin());

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
  await page.waitForSelector(selector, { visible: true, timeout: 10000 });
  await page.click(selector);
};

const retryWithWorkaround = async <T>(
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

const retryWithDelay = async <T>(
  action: () => Promise<T>,
  delay: number = 1000,
  retries: number = 3
): Promise<T> => retryWithWorkaround(action, () => sleep(delay), retries);

const writeImageMetadata = async (
  description: string,
  keywords: string[],
  categories: string[],
  imageFile: FileDescriptor
): Promise<string> => {
  const csv = await writeCsv({
    header: (
      [
        "filename",
        "description",
        "keywords",
        "categories",
        "editorial",
        "mature content",
        "illustration",
      ] as const
    ).map((id) => ({ id, title: capitalize(id) })),
    records: [
      {
        filename: imageFile.base,
        description,
        keywords,
        categories,
        editorial: "no",
        "mature content": "no",
        illustration: "yes",
      },
    ],
    output: join(
      imageFile.dir,
      getTaggedFileName(
        setFileExtension(imageFile.base, "csv"),
        "shutterstock-metadata"
      )
    ),
  });

  return csv;
};

const clickStartHere = async (page: Page): Promise<void> => {
  const element = await page.waitForSelector("text/Start here", {
    visible: true,
    timeout: 5000,
  });
  await element?.click({
    offset: {
      x: 186.703125,
      y: 26.5,
    },
  });
};

const shutterstockSignin = async (
  page: Page,
  username: string,
  password: string
): Promise<void> => {
  const USERNAME_INPUT = "input#login-username";
  await input(page, USERNAME_INPUT, username);
  const PASSWORD_INPUT = "input#login-password";
  await input(page, PASSWORD_INPUT, password);
  const SIGNIN_BUTTON = "button#login";

  await click(page, SIGNIN_BUTTON);
};

const shutterStockUploadCsv = async (page: Page, csvPath: string) => {
  await retryWithWorkaround(
    () =>
      page.waitForSelector("a.o_EditorMain_EditorMain_uploadCsv", {
        visible: true,
        timeout: 2000,
      }),
    async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      await closeEditorModals(page);
    }
  );

  await page.$eval(`a.o_EditorMain_EditorMain_uploadCsv`, (element) =>
    element.click()
  );
  await retryWithDelay(async () => {
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser({ timeout: 2000 }),
      await page.$eval(`button[data-track="click.page.uploadCSV"]`, (e) =>
        e.click()
      ),
    ]);
    await fileChooser.accept([csvPath]);
  });
};

const suppress = async <T>(
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

const containsTextSelector = (element: string, text: string) =>
  `::-p-xpath(//${element}[contains(text(), "${text}")])`;

const selectAll = async (page: Page) => {
  const MULTI_SELECT_BUTTON = containsTextSelector("span", "Multi-select");
  const SELECT_ALL_BUTTON = `span[data-icon="check"]`;
  await retryWithWorkaround(
    async () => {
      await page.$eval(MULTI_SELECT_BUTTON, (e) => (e as any).click());
      await page.waitForSelector(MULTI_SELECT_BUTTON, {
        hidden: true,
        timeout: 2000,
      });
    },
    () => closeEditorModals(page)
  );

  await retryWithWorkaround(
    async () => {
      await page.$eval(SELECT_ALL_BUTTON, (e) => (e as any).click());
      await page.waitForSelector(SELECT_ALL_BUTTON, {
        hidden: true,
        timeout: 3000,
      });
    },
    () => closeEditorModals(page)
  );
};

const cleanup = async (page: Page) => {
  await selectAll(page);

  await page.$eval('button>span[data-icon="trash"]', (element) =>
    element.click()
  );

  await _delete(page);
};

const waitForEditor = async (page: Page) => {
  const SUBMIT_CONTENT_HEADER =
    '::-p-xpath(//h4[contains(text(), "Submit content")])';
  await page.waitForSelector(SUBMIT_CONTENT_HEADER);
};

const closeEditorModals = async (page: Page) => {
  await suppress(clickByText(page, "Start adding details"));
  await suppress(clickByText(page, "Close"));
};

const SELECT_FILES_BUTTON = "a.btn-upload-files";
const waitForUploader = async (page: Page) => {
  await page.waitForSelector(SELECT_FILES_BUTTON, {
    visible: true,
    timeout: 3000,
  });
};

const closeUploaderModals = async (page: Page) => {
  await suppress(clickByText(page, "Got It!"));
};

const shutterstockUploadImage = async (page: Page, imagePath: string) => {
  const NEXT_BUTTON = "a#upload-next-btn:not([disabled])";

  await waitForUploader(page);
  await retryWithWorkaround(
    async () => {
      await sleep(2000);
      const [fileChooser] = await Promise.all([
        page.waitForFileChooser({ timeout: 5000 }),
        click(page, SELECT_FILES_BUTTON),
      ]);
      await fileChooser.accept([imagePath]);
      await page.waitForSelector(NEXT_BUTTON, {
        visible: true,
        timeout: 30000,
      });
    },
    async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      await closeUploaderModals(page);
    }
  );

  await retryWithWorkaround(
    async () => {
      await click(page, NEXT_BUTTON);
      await waitForEditor(page);
    },
    () => closeUploaderModals(page)
  );

  await retryWithWorkaround(
    () => refreshNow(page),
    () => closeEditorModals(page)
  );
};

type ShutterstockUploadParameters = {
  imagePath: string;
  title: string;
  categories:
    | [ShutterstockCategory, ShutterstockCategory]
    | [ShutterstockCategory];
  keywords: string[];
};
const semaphore = new Semaphore(1);

const SUBMIT_BUTTON = 'span[data-test-ref="submit-button"]';

export async function* shutterstockUpload(
  { imagePath, title, categories, keywords }: ShutterstockUploadParameters,
  { shutterstockPassword, shutterstockUsername }: ShutterstockConfig
): AsyncIterable<string> {
  const release = await semaphore.acquire();
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  try {
    await page.goto("https://submit.shutterstock.com/edit");

    await shutterstockSignin(page, shutterstockUsername, shutterstockPassword);

    yield "Signed in to Shutterstock";

    await waitForEditor(page);

    await retryWithWorkaround(
      async () => {
        await clickStartHere(page);
        await waitForUploader(page);
      },
      async () => {
        await closeEditorModals(page);
        await cleanup(page);
      }
    );

    await shutterstockUploadImage(page, imagePath);

    yield "Uploaded image to Shutterstock";

    const csvPath = await writeImageMetadata(
      title,
      keywords,
      categories,
      getFileDescriptor(imagePath)
    );

    await waitForEditor(page);
    await retryWithWorkaround(
      () => shutterStockUploadCsv(page, csvPath),
      () => closeEditorModals(page)
    );

    yield "Uploaded CSV to Shutterstock";

    await waitForEditor(page);

    await waitForEditor(page);
    await retryWithWorkaround(
      async () => {
        await selectAll(page);
      },
      () => page.reload({ waitUntil: "domcontentloaded" })
    );

    await retryWithWorkaround(
      async () => {
        await page.$eval(SUBMIT_BUTTON, (e) => e.click());
        await clickByText(page, "Submit");
        await page.waitForSelector(SUBMIT_BUTTON, {
          hidden: true,
        });
      },
      () => closeEditorModals(page)
    );

    yield "Submitted image to Shutterstock";
    return;
  } finally {
    await page.screenshot({
      path: resolve(process.cwd(), "./failure.png"),
    });
    await browser.close();
    release();
  }
}
