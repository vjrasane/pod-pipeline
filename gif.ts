const fs = require("fs");

const GIFEncoder = require("gifencoder");
const { createCanvas, loadImage } = require("canvas");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const ffprobe = require("@ffprobe-installer/ffprobe");

const ffmpeg = require("fluent-ffmpeg")()
  .setFfprobePath(ffprobe.path)
  .setFfmpegPath(ffmpegInstaller.path);

const width = 400;
const height = 400;

const main = async () => {
  const outputGif = "./output.gif";
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const encoder = new GIFEncoder(width, height);
  encoder.createReadStream().pipe(fs.createWriteStream(outputGif));
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(10);
  encoder.setQuality(10);

  const image = await loadImage("./1110186104063271083/3x2.png");

  const frames = 100;

  const imageMiddleX = image.width / 2;
  const imageMiddleY = image.height / 2;

  for (let i = 0; i < frames; i++) {
    const squareSize = 5000 + 10 * i;
    ctx.drawImage(
      image,
      imageMiddleX - squareSize / 2,
      imageMiddleY - squareSize / 2,
      squareSize,
      squareSize,
      0,
      0,
      canvas.width,
      canvas.height
    );
    encoder.addFrame(ctx);
    console.log(`Frame ${i + 1}/${frames}`);
  }

  encoder.finish();

  await new Promise<void>((res, rej) => {
    ffmpeg
      .input(outputGif)
      .noAudio()
      .outputOptions("-pix_fmt yuv420p")
      .output(`./output.mp4`)
      .on("end", () => res())
      .on("error", (e: any) => rej(e))
      .run();
  });
};

main();
