// https://www.123rf.com/contributor/upload-content?category=ai-images
// https://www.123rf.com/contributor/manage-content?tab=draft

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
  retryWithDelay,
  retryWithWorkaround,
  suppress,
  waitPageContains,
  waitPageNotContains,
} from "../puppeteer/utils";
// import UserAgent from "user-agents";
import dotenv from "dotenv";
import randomUseragent from "random-useragent";
import axios from "axios";

dotenv.config();

puppeteer.use(StealthPlugin());

const semaphore = new Semaphore(1);

const username = process.env._123RF_USERNAME ?? "";
const password = process.env._123RF_PASSWORD ?? "";

(async () => {
  const response = await axios.get("http://127.0.0.1:9222/json/version");
  const { webSocketDebuggerUrl } = response.data;

  const release = await semaphore.acquire();
  const browser = await puppeteer.connect({
    browserWSEndpoint: webSocketDebuggerUrl,
  });
  const page = await browser.newPage();
  // await page.setUserAgent(randomUseragent.getRandom());
  // await page.setViewport({
  //   width: 1920 + Math.floor(Math.random() * 100),
  //   height: 3000 + Math.floor(Math.random() * 100),
  //   deviceScaleFactor: 1,
  //   hasTouch: false,
  //   isLandscape: false,
  //   isMobile: false,
  // });

  // await page.setRequestInterception(true);
  // page.on("request", (request) => {
  //   if (
  //     ["image", "stylesheet", "font", "script"].indexOf(
  //       request.resourceType()
  //     ) !== -1
  //   ) {
  //     request.abort();
  //   } else {
  //     request.continue();
  //   }
  // });

  // await page.evaluateOnNewDocument(() => {
  //   // Pass webdriver check
  //   Object.defineProperty(navigator, "webdriver", {
  //     get: () => false,
  //   });
  // });

  // await page.evaluateOnNewDocument(() => {
  //   // Pass chrome check
  //   window.chrome = {
  //     /* @ts-ignore-error */
  //     runtime: {},
  //     // etc.
  //   };
  // });

  // await page.evaluateOnNewDocument(() => {
  //   //Pass notifications check
  //   const originalQuery = window.navigator.permissions.query;
  //   return (window.navigator.permissions.query = (parameters) =>
  //     /* @ts-ignore-error */
  //     parameters.name === "notifications"
  //       ? Promise.resolve({ state: Notification.permission })
  //       : originalQuery(parameters));
  // });

  // await page.evaluateOnNewDocument(() => {
  //   // Overwrite the `plugins` property to use a custom getter.
  //   Object.defineProperty(navigator, "plugins", {
  //     // This just needs to have `length > 0` for the current test,
  //     // but we could mock the plugins too if necessary.
  //     get: () => [1, 2, 3, 4, 5],
  //   });
  // });

  // await page.evaluateOnNewDocument(() => {
  //   // Overwrite the `languages` property to use a custom getter.
  //   Object.defineProperty(navigator, "languages", {
  //     get: () => ["en-US", "en"],
  //   });
  // });

  // const signin = async () => {
  //   await page.goto("https://www.123rf.com/login/", {
  //     waitUntil: "domcontentloaded",
  //   });

  //   await sleep(2000);
  //   await input(page, 'input[name="userName"]', username);
  //   await input(page, 'input[name="userPassword"]', password);

  //   await clickByText(page, "Login");
  //   await waitPageNotContains(page, "Members Log in");
  // };

  try {
    // await retryWithDelay(() => signin());

    // await page.setRequestInterception(false);
    await page.goto(
      "https://www.123rf.com/contributor/manage-content?tab=draft",
      {
        waitUntil: "domcontentloaded",
      }
    );

    await waitPageContains(page, "Manage Content");
    // await page.click(
    //   "div#selected-null-value"
    //   // "#content-dropdown-type-filter > div:nth-child(2) > div > div > button"
    // );
    // await page.waitForSelector("div#AI_IMAGES", {
    //   visible: true,
    //   timeout: 2000,
    // });
    // await page.click("div#AI_IMAGES");
    // await page.reload({
    //   waitUntil: "domcontentloaded",
    // });
    // await suppress(async () => {
    //   await waitPageContains(page, "Checkout the AI keyworder!", 2000);
    //   await clickByText(page, "Next");
    // });

    // await suppress(async () => {
    //   await page.click("img#delete-button-img");
    //   await clickByText(page, "Yes");
    // });

    // await suppress(async () => {
    //   await page.click("input#selectAll");
    //   await clickByText(page, "Yes");
    // });

    // await suppress(async () => {
    //   await page.click("img#delete-button-img");
    //   await clickByText(page, "Yes");
    // });
    // await page.$eval(containsTextSelector("span", "Sign in"), (e: any) =>
    //   e.click()
    // );

    // await clickByText(page, "Sign in");
    // await page.waitForNavigation({ waitUntil: "domcontentloaded" });
    // await page.goto("https://www.alamy.com/myupload/Index.aspx", {
    //   waitUntil: "domcontentloaded",
    // });
    // const UPLOAD_BTN = "button#headerUploadBtn";
    // await sleep(2000);
    // await page.waitForSelector(UPLOAD_BTN, { visible: true });
    // await page.click(UPLOAD_BTN);

    // await waitPageContains(page, "What are you uploading today?");
    // await page.$eval(
    //   "#imagetypesel > ul:nth-child(3) > li > ul > li:nth-child(2) > label > input",
    //   (e) => e.click()
    // );

    // await clickByText(page, "Next");

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
