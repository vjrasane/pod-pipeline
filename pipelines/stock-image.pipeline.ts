import {
  array,
  nonEmptyString,
  oneOf,
  positiveInteger,
  tuple,
  either,
} from "decoders";
import { Options } from "../init";
import { resize, convert } from "../functions/image";
import upscale from "../functions/upscale";
import {
  FileDescriptor,
  combineAsyncIterables,
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
import { Conversation, converse, initOpenAi } from "../functions/chat";
import {
  ADOBE_STOCK_CATEGORIES,
  SHUTTERSTOCK_CATEGORIES,
  ShutterstockCategory,
  adobeStockCategoryPrompt,
  keywordsPrompt,
  shutterstockCategoryPrompt,
  titlePrompt,
} from "../prompts/stock-image";
import { promisify } from "util";
import { readFile } from "fs";
import { ChatCompletionResponseMessage } from "openai";
import { trim, take } from "lodash";
import {
  AdobeConfig,
  Config,
  OpenAiConfig,
  ShutterstockConfig,
} from "../config";
import { compact, inRange } from "lodash/fp";
import { shutterstockUpload } from "../functions/shutterstock";

const UPSCALE_MULTIPLIER = 4;
const RESOLUTION = 4 * 1000 * 1000;

const generateAdobeStockCategory = async (
  conversation: Conversation
): Promise<number> => {
  const categoryMessage = await conversation.say(adobeStockCategoryPrompt, 1);
  const imageCategory = nonEmptyString
    .transform((str) => trim(str, "."))
    .transform((str) => parseInt(str))
    .then(positiveInteger.decode)
    .refine((num) => inRange(1, 21, num), "Number not between 1 and 21")
    .verify(categoryMessage.content);

  return imageCategory;
};

const generateShutterstockCategories = async (
  conversation: Conversation
): Promise<
  [ShutterstockCategory, ShutterstockCategory] | [ShutterstockCategory]
> => {
  const categoryMessage = await conversation.say(
    shutterstockCategoryPrompt,
    50
  );
  const imageCategories = nonEmptyString
    .transform((str) => str.split(","))
    .transform((arr) => arr.map((str) => trim(str.trim(), ".")))
    .transform((arr) => take(arr, 2))
    .then(
      either(
        tuple(oneOf(SHUTTERSTOCK_CATEGORIES)),
        tuple(oneOf(SHUTTERSTOCK_CATEGORIES), oneOf(SHUTTERSTOCK_CATEGORIES))
      ).decode
    )
    .verify(categoryMessage.content);

  return imageCategories;
};

export async function* stockImagePipeline(
  imageFile: string,
  prompt: string,
  outputDir: string,
  config: Config & OpenAiConfig & AdobeConfig & ShutterstockConfig
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

  const conversation = new Conversation(initOpenAi(config));

  const titleMessage = await conversation.say(titlePrompt(prompt), 100);
  const imageTitle = nonEmptyString
    .transform((str) =>
      str
        .split(".")
        .reduce((acc, curr) =>
          acc.length + curr.length >= 200 ? acc : [acc, curr].join(".")
        )
    )
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

  const [adobeStockConversation] = [conversation.duplicate()];

  const adobeStockCategory = await generateAdobeStockCategory(
    adobeStockConversation
  );
  // const shuttestockCategories = await generateShutterstockCategories(
  //   shutterstockConversation
  // );

  yield `Wrote Adobe Stock image category: ${
    ADOBE_STOCK_CATEGORIES[
      adobeStockCategory as keyof typeof ADOBE_STOCK_CATEGORIES
    ]
  }`;
  // yield `Wrote Shutterstock categories: ${shuttestockCategories.join(", ")}`;

  const resultFile = getFileDescriptor(converted);

  const generator = combineAsyncIterables([
    adobeStockUpload(
      {
        image: resultFile.path,
        title: imageTitle,
        keywords: imageKeywords,
        category: adobeStockCategory,
      },
      config
    ),
    // shutterstockUpload(
    //   {
    //     imagePath: resultFile.path,
    //     title: imageTitle,
    //     categories: shuttestockCategories,
    //     keywords: imageKeywords,
    //   },
    //   config
    // ),
  ]);

  for await (const status of generator) {
    yield status;
  }
}
