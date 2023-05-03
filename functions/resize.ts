import sharp from "sharp";
import { Config } from "../config";
import { dirname, resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import { mapValues } from "lodash/fp";

type ResizeParameters = {
  width: number;
  height: number;
  input: string;
  output: string;
};

export default async (
  { input, output, width, height }: ResizeParameters,
  { workDir }: Config
): Promise<string> => {
  const inputPath = resolve(workDir, input);
  const outputPath = resolve(workDir, output);

  if (existsSync(outputPath)) {
    console.log(`Resize output ${outputPath} already exists`);
    return outputPath;
  }

  const inputInstance = sharp(inputPath);
  const outputDir = dirname(outputPath);
  mkdirSync(outputDir, { recursive: true });
  await inputInstance
    .resize(Math.floor(width), Math.floor(height))
    .toFile(outputPath);
  return outputPath;
};
