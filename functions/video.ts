import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
/* @ts-expect-error */
import ffprobe from "@ffprobe-installer/ffprobe";
import fluent from "fluent-ffmpeg";
import { existsSync } from "fs";

const ffmpeg = fluent()
  .setFfprobePath(ffprobe.path)
  .setFfmpegPath(ffmpegInstaller.path);

export const gifToVideo = async (input: string, output: string) => {
  if (existsSync(output)) {
    console.log(`Video output ${output} already exists`);
    return output;
  }

  await new Promise<void>((res, rej) => {
    ffmpeg
      .input(input)
      .noAudio()
      .outputOptions("-pix_fmt yuv420p")
      .output(output)
      .on("end", () => res())
      .on("error", (e: any) => rej(e))
      .run();
  });
  return output;
};
