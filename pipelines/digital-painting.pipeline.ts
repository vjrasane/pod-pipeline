import { nonEmptyString, positiveInteger } from "decoders";
import {
  copyFile,
  existsSync,
  mkdtemp,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rename,
  rm,
  rmdir,
  writeFileSync,
} from "fs";
import { assignInAllWith, max, maxBy } from "lodash/fp";
import { Conversation, chat, initOpenAi } from "../functions/chat";
import forEachFile from "../functions/for-each-file";
import init, { Options } from "../init";
import naming from "../prompts/naming";
import { resize } from "../functions/image";
import upscale from "../functions/upscale";
import {
  FileDescriptor,
  getFileDescriptor,
  getImageDimensions,
  getTaggedFileName,
} from "../utils";
import { join, resolve } from "path";
import crop from "../functions/crop";
import forEachValue from "../functions/for-each-value";
import { promisify } from "util";
import run from "../run";
import mockup from "../functions/mockup";
import { driveUpload, driveShare } from "../functions/drive";
import { Config, EtsyConfig, GoogleApiConfig, OpenAiConfig } from "../config";
import multiMockup from "../functions/multi-mockup";
import { addLinkToPdf, getPageDimensions } from "../functions/pdf";
import { createGif } from "../functions/gif";
import { gifToVideo } from "../functions/video";
import {
  paintingNaming,
  paintingTags,
  paintingDescription,
  paintingSection,
} from "../prompts/painting";
import {
  createListing,
  createShopSection,
  getShopSections,
} from "../functions/etsy/etsy-api";
import { EtsySession } from "../functions/etsy/etsy-auth";

const PIXELS_PER_INCH = 300;
const UPSCALE_MULTIPLIER = 4;

const ASPECT_RATIOS = [
  { h: 24, w: 36, name: "3x2" },
  { h: 24, w: 32, name: "4x3" },
  { h: 24, w: 30, name: "5x4" },
  { h: 11, w: 14, name: "14x11" },
  { h: 23.4, w: 33.1, name: "iso" },
] as const;

const MAX_HEIGHT = positiveInteger.verify(max(ASPECT_RATIOS.map(({ h }) => h)));

const MAX_WIDTH = positiveInteger.verify(max(ASPECT_RATIOS.map(({ w }) => w)));

const getTitle = async (
  conversation: Conversation,
  prompt: string,
  outputDir: string
): Promise<string> => {
  const titleFile = join(outputDir, "title.txt");
  const namingPrompt = paintingNaming(prompt);

  if (existsSync(titleFile)) {
    console.log("Title file already exists");
    const title = readFileSync(titleFile, "utf-8");
    conversation.append(
      { role: "user", content: namingPrompt },
      {
        role: "assistant",
        content: title,
      }
    );
    return title;
  }

  const { content } = await conversation.say(namingPrompt, 100);
  writeFileSync(titleFile, content);
  return content;
};

const getDescription = async (
  conversation: Conversation,
  outputDir: string
): Promise<string> => {
  const descriptionFile = join(outputDir, "description.txt");
  const descriptionPrompt = paintingDescription;

  if (existsSync(descriptionFile)) {
    console.log("Description file already exists");
    const description = readFileSync(descriptionFile, "utf-8");
    conversation.append(
      { role: "user", content: descriptionPrompt },
      {
        role: "assistant",
        content: description,
      }
    );
    return description;
  }

  const { content } = await conversation.say(descriptionPrompt, 100);
  writeFileSync(descriptionFile, content);
  return content;
};

const getSection = async (
  conversation: Conversation,
  sections: string[],
  outputDir: string
): Promise<string> => {
  const sectionFile = join(outputDir, "section.txt");
  const sectionPrompt = paintingSection(sections);

  if (existsSync(sectionFile)) {
    console.log("Section file already exists");
    const section = readFileSync(sectionFile, "utf-8");
    conversation.append(
      { role: "user", content: sectionPrompt },
      {
        role: "assistant",
        content: section,
      }
    );
    return section;
  }

  const { content } = await conversation.say(sectionPrompt, 100);
  writeFileSync(sectionFile, content);
  return content;
};

export async function* digitialPaintingPipeline(
  imagePath: string,
  prompt: string,
  outputDir: string,
  config: Config & OpenAiConfig & GoogleApiConfig & EtsyConfig
): AsyncIterable<string> {
  const [width, height] = await getImageDimensions(imagePath);

  const heightMultiplier =
    (PIXELS_PER_INCH * MAX_HEIGHT) / UPSCALE_MULTIPLIER / height;
  const widthMultiplier =
    (PIXELS_PER_INCH * MAX_WIDTH) / UPSCALE_MULTIPLIER / width;
  const multiplier = Math.max(heightMultiplier, widthMultiplier);

  const imageDescriptor = getFileDescriptor(imagePath);

  const resized = await resize(
    {
      width: width * multiplier,
      height: height * multiplier,
      input: imageDescriptor.path,
      output: join(outputDir, getTaggedFileName(imageDescriptor, "resized")),
    },
    config
  );

  yield "Resized image";

  const upscaled = await upscale(
    {
      input: resized,
      output: join(outputDir, getTaggedFileName(imageDescriptor, "upscaled")),
    },
    config
  );

  yield "Upscaled image";

  const cropped = await Promise.all(
    ASPECT_RATIOS.map(({ w, h, name }) => {
      const fileName = `${name}${imageDescriptor.ext}`;
      return resize(
        {
          width: w * PIXELS_PER_INCH,
          height: h * PIXELS_PER_INCH,
          input: upscaled,
          output: join(outputDir, fileName),
        },
        config
      );
    })
  );
  const [cropped3x2, cropped4x3, cropped5x4, cropped14x11, croppedIso] =
    cropped;

  yield "Cropped image";

  await mockup(
    croppedIso,
    join(outputDir, "mockup-iso-mitarts.png"),
    resolve(__dirname, "../mockups/painting-iso-mitarts.psd")
  );

  yield "Created ISO mockup one";

  await mockup(
    croppedIso,
    join(outputDir, "mockup-iso-northprints.png"),
    resolve(__dirname, "../mockups/painting-iso-northprints.psd")
  );

  yield "Created ISO mockup two";

  await mockup(
    croppedIso,
    join(outputDir, "mockup-passepartou-iso.png"),
    resolve(__dirname, "../mockups/painting-passepartou-iso.psd")
  );

  yield "Created passepartou mockup";

  await mockup(
    cropped4x3,
    join(outputDir, "mockup-4x3.png"),
    resolve(__dirname, "../mockups/painting-4x3.psd")
  );

  yield "Created 4x3 mockup";

  await mockup(
    cropped3x2,
    join(outputDir, "mockup-center-3x2.png"),
    resolve(__dirname, "../mockups/painting-center-3x2.psd")
  );

  yield "Created center mockup";

  await mockup(
    cropped3x2,
    join(outputDir, "mockup-closeup-3x2.png"),
    resolve(__dirname, "../mockups/painting-closeup-3x2.psd")
  );

  yield "Created closeup mockup";

  await multiMockup(
    {
      graphic_3x2: cropped3x2,
      graphic_4x3: cropped4x3,
      graphic_5x4: cropped5x4,
      graphic_14x11: cropped14x11,
      graphic_iso: croppedIso,
    },
    join(outputDir, "mockup-aspect-artios.png"),
    resolve(__dirname, "../mockups/painting-aspect-ratios.psd")
  );

  yield "Created aspect ratio mockup";

  const uploadId = imageDescriptor.dirname;
  const listingFolderPath = `Listings/${uploadId}`;
  const sharedFolderPath = `${listingFolderPath}/Shared`;

  await driveUpload(sharedFolderPath, cropped.map(getFileDescriptor), config);
  yield "Uploaded to drive";

  const link = await driveShare(sharedFolderPath, config);

  yield "Created a share link";

  const downloadTemplate = resolve(
    __dirname,
    "../mockups/download-template.pdf"
  );
  const [pdfWidth] = await getPageDimensions(downloadTemplate);
  const downloadFile = await addLinkToPdf(
    downloadTemplate,
    join(outputDir, "download.pdf"),
    link,
    [0, 280, 0 + pdfWidth, 280 + 80]
  );

  yield "Created download file";

  const gifFile = await createGif(
    cropped3x2,
    join(outputDir, "image-with-logo.gif")
  );

  yield "Created gif";

  const videoFile = await gifToVideo(gifFile, join(outputDir, "video.mp4"));

  yield "Created video";

  const conversation: Conversation = new Conversation(initOpenAi(config));
  const title = await getTitle(conversation, prompt, outputDir);
  const description = await getDescription(conversation, outputDir);

  yield "Wrote title and description";

  await promisify(copyFile)(
    resolve(__dirname, "../mockups/print-sizes.png"),
    join(outputDir, "print-sizes.png")
  );

  await promisify(copyFile)(
    resolve(__dirname, "../mockups/product-info.png"),
    join(outputDir, "product-info.png")
  );

  yield "Copied miscellaneous files";

  const session = new EtsySession(config);

  const sections = await getShopSections(session);

  const sectionName = await getSection(
    conversation,
    sections.map(({ title }) => title),
    outputDir
  );

  yield "Wrote shop section: " + sectionName;

  let section = sections.find((s) => s.title === sectionName);
  if (!section) {
    section = await createShopSection(sectionName, session);
    yield "Created new shop section: " + sectionName;
  }

  const listingFile = join(outputDir, "listing.txt");
  let listingId: number;
  if (existsSync(listingFile)) {
    console.log("Listing ID file already exists");
    listingId = parseInt(readFileSync(listingFile, "utf-8"));
  } else {
    listingId = await createListing(
      {
        title,
        description,
        price: 2.0,
        taxonomy: "Art & Collectibles",
        section,
      },
      session
    );
    writeFileSync(listingFile, String(listingId));
    yield "Created draft listing: " + listingId;
  }

  return;
}
