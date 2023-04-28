import { constant, Decoder, DecoderType, exact, nonEmptyString, optional, string, tuple, number, either, oneOf, always } from "decoders";
import { replaceVariables } from "../utils";
import sharp, { Region } from "sharp"
import { Executor } from "./step";
import { Config } from "../config";
import { dirname, join } from "path";
import { compact, mapValues } from "lodash/fp";
import { mkdirSync } from "fs";

const decoder = exact({
    step: constant("crop"),
    name: optional(nonEmptyString),
    aspectRatio: nonEmptyString,
    input: nonEmptyString,
    output: nonEmptyString,
});

type CropStep = DecoderType<typeof decoder>

const aspectRatio = (delimiter: string): Decoder<number> =>
    string
        .transform((str) => str.split(delimiter))
        .transform((arr) => arr.map((s) => parseInt(s)))
        .then(tuple(number, number).decode)
        .transform(([width, height]) => width / height);

const isoLetter: Decoder<number> = string.transform(str => str.toLowerCase()).then(
    either(
        constant("iso"),
        string.refine(str => !!str.match(/^a[1-9]$/)?.length, "Not valid ISO letter size")
    ).decode
).then(
    always(1 / Math.sqrt(2)).decode
)

const parseAspectRatio = (str: string): number => either(
    aspectRatio("x"),
    aspectRatio(":"),
    isoLetter
).describe("Invalid aspect ratio: " + str).verify(str)

const execute: Executor<CropStep> = async (step: CropStep, conf: Config, env: Record<string, any>): Promise<void> => {
    const { input, output, aspectRatio } = replaceVariables(step, env)

    const targetAspectRatio = parseAspectRatio(aspectRatio)

    const inputInstance = sharp(input)
    const metadata = await inputInstance.metadata()

    const imageWidth = metadata.width ?? 0;
    const imageHeight = metadata.height ?? 0;
    const currentAspectRatio = imageWidth / imageHeight;

    let cropX, cropY, cropWidth, cropHeight;

    if (currentAspectRatio > targetAspectRatio) {
        // image is wider than the target aspect ratio, crop the sides
        cropHeight = imageHeight;
        cropWidth = cropHeight * targetAspectRatio;
        cropX = (imageWidth - cropWidth) / 2;
        cropY = 0;
    } else {
        // image is taller than the target aspect ratio, crop the top and bottom
        cropWidth = imageWidth;
        cropHeight = cropWidth / targetAspectRatio;
        cropX = 0;
        cropY = (imageHeight - cropHeight) / 2;
    }

    const workDir = replaceVariables(conf.workDir, env)
    const outputPath = join(...compact([workDir, output]))
    const outputDir = dirname(outputPath)
    mkdirSync(outputDir, { recursive: true })
    await inputInstance.extract(mapValues((value) => Math.floor(value), { left: cropX, top: cropY, width: cropWidth, height: cropHeight } as unknown as Region))
        .toFile(outputPath);

}

export { decoder, execute }
