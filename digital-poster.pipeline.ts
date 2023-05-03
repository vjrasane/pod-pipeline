import { nonEmptyString } from "decoders";
import { mkdtemp, mkdtempSync, readdirSync, readFileSync, rm, rmdir } from "fs";
import { assignInAllWith } from "lodash/fp";
import chat from "./functions/chat";
import forEachFile from "./functions/for-each-file";
import init, { Options } from "./init";
import naming from "./prompts/naming";
import resize from "./functions/resize";
import upscale from "./functions/upscale";
import { FileDescriptor, getImageDimensions, getTaggedFileName } from "./utils";
import { join, resolve } from "path";
import crop from "./functions/crop";
import forEachValue from "./functions/for-each-value";
import { promisify } from "util";
import run from "./run";
import mockup from "./functions/mockup";

const PIXELS_PER_INCH = 300;
const UPSCALE_MULTIPLIER = 4;

const processFile = async (file: FileDescriptor, outputDir: string) => {
  const config = {
    workDir: process.cwd(),
    openAiApiKey: nonEmptyString.verify(process.env.OPENAI_API_KEY),
    openAiOrganizationId: nonEmptyString.verify(
      process.env.OPENAI_ORGANIZATION_ID
    ),
  };

  // const name = chat({ prompt: naming(file.name, 25), maxTokens: 25 }, config)
  const [width, height] = await getImageDimensions(file.path);

  const heightMultiplier = (PIXELS_PER_INCH * 36) / UPSCALE_MULTIPLIER / height;
  const widthMultiplier = (PIXELS_PER_INCH * 24) / UPSCALE_MULTIPLIER / width;
  const multiplier = Math.max(heightMultiplier, widthMultiplier);

  const fileOutputDir = join(outputDir, file.name);

  const resized = await resize(
    {
      width: width * multiplier,
      height: height * multiplier,
      input: file.path,
      output: join(fileOutputDir, getTaggedFileName(file, "resized")),
    },
    config
  );

  const upscaled = await upscale(
    {
      input: resized,
      output: join(fileOutputDir, getTaggedFileName(file, "upscaled")),
    },
    config
  );

  const cropped = await forEachValue(
    {
      values: [
        { w: 24, h: 36, name: "2x3" },
        { w: 24, h: 32, name: "3x4" },
        { w: 24, h: 30, name: "4x5" },
        { w: 11, h: 14, name: "11x14" },
        { w: 23.4, h: 33.1, name: "iso" },
      ] as const,
    },
    ({ w, h, name }) => {
      const fileName = `${name}${file.ext}`;
      return resize(
        {
          width: w * PIXELS_PER_INCH,
          height: h * PIXELS_PER_INCH,
          input: upscaled,
          output: join(fileOutputDir, fileName),
        },
        config
      );
    }
  );

  const mockupFile = await mockup(
    {
      input: join(fileOutputDir, "2x3.png"),
      output: join(fileOutputDir, "mockup-2x3.png"),
      mockup: resolve(__dirname, "mockups/poster-2x3.psd"),
    },
    config
  );
};

run(async (file: FileDescriptor, opts: Options) => {
  await processFile(file, opts.output);
});
