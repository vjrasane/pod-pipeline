import { array, nonEmptyString, positiveInteger } from "decoders";
import { Options } from "../init";
import { resize, convert } from "../functions/image";
import upscale from "../functions/upscale";
import {
  FileDescriptor,
  getDirectoryImage,
  getDirectoryText,
  getFileDescriptor,
  getImageDimensions,
  getTaggedFileName,
  setFileExtension,
} from "../utils";
import { join, resolve } from "path";
import run from "../run";
import { adobeStockUpload } from "../functions/adobe-stock";
import { Conversation, converse } from "../functions/chat";
import {
  CATEGORIES,
  categoryPrompt,
  keywordsPrompt,
  titlePrompt,
} from "../prompts/stock-image";
import { promisify } from "util";
import { readFile } from "fs";
import { ChatCompletionResponseMessage } from "openai";
import { trim, take } from "lodash";
import { AdobeConfig, Config, OpenAiConfig } from "../config";
import { compact, inRange } from "lodash/fp";

const UPSCALE_MULTIPLIER = 4;
const RESOLUTION = 4 * 1000 * 1000;

export async function* stockImagePipeline(
  imageFile: string,
  prompt: string,
  outputDir: string,
  config: Config & OpenAiConfig & AdobeConfig
): AsyncIterable<string> {
  const { workDir } = config;

  const [outputDirPath, imageFilePath] = [
    resolve(workDir, outputDir),
    resolve(workDir, imageFile),
  ];

  const [width, height] = await getImageDimensions(imageFilePath);
  const aspectRatio = width / height;
  const requiredWidth = Math.sqrt(aspectRatio * RESOLUTION);
  const downscaleWidth = requiredWidth / UPSCALE_MULTIPLIER;
  const resizeWidth = Math.max(downscaleWidth, width);

  const resized = await resize(
    {
      width: resizeWidth,
      height: resizeWidth / aspectRatio,
      input: imageFilePath,
      output: join(outputDirPath, getTaggedFileName(imageFile, "resized")),
    },
    config
  );

  yield "Resized image";

  const upscaled = await upscale(
    {
      input: resized,
      output: join(outputDirPath, getTaggedFileName(imageFile, "upscaled")),
    },
    config
  );

  yield "Upscaled image";

  const converted = await convert(
    {
      format: "jpeg",
      input: upscaled,
      output: join(
        outputDirPath,
        getTaggedFileName(setFileExtension(imageFile, "jpeg"), "converted")
      ),
    },
    config
  );

  yield "Converted image to JPG";

  const conversation = new Conversation(config);

  const titleMessage = await conversation.say(titlePrompt(prompt, 100), 100);
  const imageTitle = nonEmptyString
    .transform((str) => str.substring(0, 200))
    .verify(titleMessage.content);

  yield `Wrote image title: ${imageTitle}`;

  const keywordsMessage = await conversation.say(keywordsPrompt, 100);
  const imageKeywords = nonEmptyString
    .transform((str) => str.split(","))
    .transform((arr) => arr.map((str) => trim(str.trim(), ".")))
    .transform(compact)
    .then(array(nonEmptyString).decode)
    .transform((arr) => take(arr, 49))
    .verify(keywordsMessage.content);

  yield `Wrote image keywords: ${imageKeywords}`;

  const categoryMessage = await conversation.say(categoryPrompt, 1);
  const imageCategory = nonEmptyString
    .transform((str) => parseInt(str))
    .then(positiveInteger.decode)
    .refine((num) => inRange(1, 21, num), "Number not between 1 and 21")
    .verify(categoryMessage.content);

  yield `Wrote image category: ${
    CATEGORIES[imageCategory as keyof typeof CATEGORIES]
  }`;

  const resultFile = getFileDescriptor(converted);

  const iterable = adobeStockUpload(
    {
      image: resultFile.path,
      title: imageTitle,
      keywords: imageKeywords,
      category: imageCategory,
    },
    config
  );

  for await (const status of iterable) {
    yield status;
  }
}
