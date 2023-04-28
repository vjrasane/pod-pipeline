import { mkdirSync } from "fs";
import { mapValues } from "lodash/fp";
import { dirname, resolve } from "path";
import sharp, { Region } from "sharp";
import { Config } from "../config"

type CropParameters = {
    aspectRatio: number | "iso",
    input: string,
    output: string
}

const ISO_LETTER_ASPECT_RATIO = 1 / Math.sqrt(2);

export default async ({ input, output, aspectRatio }: CropParameters,
    { workDir }: Config
): Promise<string> => {

    const targetAspectRatio = aspectRatio === "iso" ? ISO_LETTER_ASPECT_RATIO : aspectRatio

    const inputPath = resolve(workDir, input)
    const inputInstance = sharp(inputPath)
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

    const outputPath = resolve(workDir, output)
    const outputDir = dirname(outputPath)
    mkdirSync(outputDir, { recursive: true })
    await inputInstance.extract(mapValues((value) => Math.floor(value), { left: cropX, top: cropY, width: cropWidth, height: cropHeight } as unknown as Region))
        .toFile(outputPath);
    return outputPath
}