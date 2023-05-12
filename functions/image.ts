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

export const resize = async (
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

type ConvertParameters = {
  format: "jpeg" | "png";
  input: string;
  output: string;
};

export const convert = async (
  { format, input, output }: ConvertParameters,
  { workDir }: Config
) => {
  const inputPath = resolve(workDir, input);
  const outputPath = resolve(workDir, output);

  if (existsSync(outputPath)) {
    console.log(`Convert output ${outputPath} already exists`);
    return outputPath;
  }

  const outputDir = dirname(outputPath);
  mkdirSync(outputDir, { recursive: true });

  const formatInstance = sharp(inputPath).toFormat(format);

  switch (format) {
    case "jpeg":
      formatInstance.jpeg({
        quality: 100,
        force: true,
      });
      break;
    case "png":
      formatInstance.png({
        quality: 100,
        force: true,
      });
  }

  await formatInstance.toFile(outputPath);

  return outputPath;
};
