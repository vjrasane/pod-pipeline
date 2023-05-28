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
  sleep,
} from "../utils";
import Semaphore from "semaphore-promise";
import {
  clickByText,
  containsTextSelector,
  input,
  retryWithWorkaround,
  suppress,
  waitPageContains,
} from "../puppeteer/utils";

import dotenv from "dotenv";

dotenv.config();

puppeteer.use(StealthPlugin());

const semaphore = new Semaphore(1);

const username = process.env.ALAMY_USERNAME ?? "";
const password = process.env.ALAMY_PASSWORD ?? "";

(async () => {
  const release = await semaphore.acquire();
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto("https://www.alamy.com/log-in/", {
      waitUntil: "domcontentloaded",
    });

    await sleep(2000);
    await input(page, 'input[name="email"]', username);
    await input(page, 'input[name="password"]', password);
    // await page.$eval(containsTextSelector("span", "Sign in"), (e: any) =>
    //   e.click()
    // );

    await clickByText(page, "Sign in");
    await page.waitForNavigation({ waitUntil: "domcontentloaded" });
    await page.goto("https://www.alamy.com/myupload/Index.aspx", {
      waitUntil: "domcontentloaded",
    });
    const UPLOAD_BTN = "button#headerUploadBtn";
    await sleep(2000);
    await page.waitForSelector(UPLOAD_BTN, { visible: true });
    await page.click(UPLOAD_BTN);

    await waitPageContains(page, "What are you uploading today?");
    await page.$eval(
      "#imagetypesel > ul:nth-child(3) > li > ul > li:nth-child(2) > label > input",
      (e) => e.click()
    );

    await clickByText(page, "Next");

    // await sleep(5000);

    // const COMPUTER_BTN = 'label[for="file"]';
    // const DELETE_BUTTON = 'button:has(> svg[aria-label="IconDeleteOutline"])';
    // await retryWithWorkaround(
    //   async () => {
    //     await page.$eval(UPLOAD_BTN, (e: any) => e.click());
    //     await sleep(2000);
    //     await page.waitForSelector(DELETE_BUTTON, {
    //       hidden: true,
    //       timeout: 5000,
    //     });
    //     await page.waitForSelector(COMPUTER_BTN, { visible: true });
    //   },
    //   async () => {
    //     const SELECT_ALL_BTN = 'button[aria-label="icon-button"] ~ a';
    //     await suppress(async () => {
    //       await page.waitForSelector(SELECT_ALL_BTN, {
    //         visible: true,
    //         timeout: 2000,
    //       });
    //       await sleep(3000);
    //       await page.$eval(SELECT_ALL_BTN, (e: any) => e.click());
    //     });

    //     const DELETE_BUTTON =
    //       'button:has(> svg[aria-label="IconDeleteOutline"])';
    //     await page.$eval(DELETE_BUTTON, (e: any) => e.click());
    //     await page.reload({ waitUntil: "domcontentloaded" });
    //   }
    // );

    // // const COMPUTER_BTN = 'label[for="file"]';
    // // await page.waitForSelector(COMPUTER_BTN, { visible: true });

    // const fileChooser = await retryWithWorkaround(
    //   async () => {
    //     const [fileChooser] = await Promise.all([
    //       page.waitForFileChooser({ timeout: 3000 }),
    //       page.$eval(COMPUTER_BTN, (e: any) => e.click()),
    //     ]);
    //     return fileChooser;
    //   },
    //   () => page.reload({ waitUntil: "domcontentloaded" })
    // );

    // await fileChooser.accept([
    //   resolve(__dirname, "../output/cherries/cherries-converted.jpeg"),
    // ]);
    // // const [fileChooser] = await Promise.all([
    // //   page.waitForFileChooser({ timeout: 2000 }),
    // //   page.$eval(COMPUTER_BTN, (e: any) => e.click()),
    // // ]);

    // // await fileChooser.accept([
    // //   resolve(__dirname, "../output/cherries/iso.png"),
    // // ]);

    // // console.log("file selected");
  } catch (err) {
    console.log("ERR", err);
  } finally {
    release();
  }
})();
