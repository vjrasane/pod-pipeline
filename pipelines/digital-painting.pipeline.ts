import { nonEmptyString, positiveInteger } from "decoders";
import { mkdtemp, mkdtempSync, readdirSync, readFileSync, rm, rmdir } from "fs";
import { assignInAllWith, max, maxBy } from "lodash/fp";
import { chat } from "../functions/chat";
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
import { Config, GoogleApiConfig, OpenAiConfig } from "../config";
import multiMockup from "../functions/multi-mockup";

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

export async function* digitialPaintingPipeline(
  imagePath: string,
  prompt: string,
  outputDir: string,
  config: Config & OpenAiConfig & GoogleApiConfig
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

  const cropped = await forEachValue(
    {
      values: ASPECT_RATIOS,
    },
    ({ w, h, name }) => {
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
    }
  );

  yield "Cropped image";

  await mockup(
    join(outputDir, "iso.png"),
    join(outputDir, "mockup-iso-mitarts.png"),
    resolve(__dirname, "../mockups/painting-iso-mitarts.psd")
  );

  yield "Created ISO mockup one";

  await mockup(
    join(outputDir, "iso.png"),
    join(outputDir, "mockup-iso-northprints.png"),
    resolve(__dirname, "../mockups/painting-iso-northprints.psd")
  );

  yield "Created ISO mockup two";

  await mockup(
    join(outputDir, "iso.png"),
    join(outputDir, "mockup-passepartou-iso.png"),
    resolve(__dirname, "../mockups/painting-passepartou-iso.psd")
  );

  yield "Created passepartou mockup";

  await mockup(
    join(outputDir, "4x3.png"),
    join(outputDir, "mockup-4x3.png"),
    resolve(__dirname, "../mockups/painting-4x3.psd")
  );

  yield "Created 4x3 mockup";

  await mockup(
    join(outputDir, "3x2.png"),
    join(outputDir, "mockup-center-3x2.png"),
    resolve(__dirname, "../mockups/painting-center-3x2.psd")
  );

  yield "Created center mockup";

  await mockup(
    join(outputDir, "3x2.png"),
    join(outputDir, "mockup-closeup-3x2.png"),
    resolve(__dirname, "../mockups/painting-closeup-3x2.psd")
  );

  yield "Created closeup mockup";

  await multiMockup(
    {
      graphic_3x2: join(outputDir, "3x2.png"),
      graphic_4x3: join(outputDir, "4x3.png"),
      graphic_5x4: join(outputDir, "5x4.png"),
      graphic_14x11: join(outputDir, "14x11.png"),
      graphic_iso: join(outputDir, "iso.png"),
    },
    join(outputDir, "mockup-aspect-artios.png"),
    resolve(__dirname, "../mockups/painting-aspect-ratios.psd")
  );

  yield "Created aspect ratio mockup";

  const listingId = "listingId";
  const listingFolderPath = `Listings/${listingId}`;
  const sharedFolderPath = `${listingFolderPath}/Shared`;

  return;
}
