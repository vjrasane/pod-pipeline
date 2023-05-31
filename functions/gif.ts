import GIFEncoder from "gifencoder";
import { createCanvas, loadImage } from "canvas";
import { existsSync, createWriteStream } from "fs";
import { resolve } from "path";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1080;

const transition = (x: number): number => {
  return Math.sqrt(1 - Math.pow(x - 1, 2));
};

const logoFile = resolve(__dirname, "../mockups/logo-white-text.png");

export const createGif = async (input: string, output: string) => {
  if (existsSync(output)) {
    console.log(`Gid output ${output} already exists`);
    return output;
  }

  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext("2d");

  const encoder = new GIFEncoder(CANVAS_WIDTH, CANVAS_HEIGHT);
  encoder.createReadStream().pipe(createWriteStream(output));
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(10);
  encoder.setQuality(10);

  const [image, logo] = await Promise.all([
    loadImage(input),
    loadImage(logoFile),
  ]);

  const frames = 100;

  const transitionDelay = 10;
  const transitionFrames = 20;

  const maxSquareSize = image.height;
  const squareGrowSpeed = 10;
  const minSquareSize = maxSquareSize - squareGrowSpeed * frames;

  const imageMiddleX = image.width / 2;
  const imageMiddleY = image.height / 2;

  const logoHeight = logo.height * (canvas.width / logo.width);

  const drawImage = (currentFrame: number): Promise<void> => {
    const squareSize = minSquareSize + squareGrowSpeed * currentFrame;
    return new Promise((res) =>
      setTimeout(() => {
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
        res();
      })
    );
  };

  const drawLogo = (currentFrame: number): Promise<void> => {
    const transitionFrame = currentFrame - transitionDelay;
    const transitionTime = Math.min(1, transitionFrame / transitionFrames);
    const opacity = transition(transitionTime);

    return new Promise((res) =>
      setTimeout(() => {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.drawImage(
          logo,
          0,
          canvas.height / 2 - logoHeight / 2,
          canvas.width,
          logoHeight
        );
        ctx.restore();
        res();
      })
    );
  };

  const renderFrame = async (currentFrame: number): Promise<void> => {
    await drawImage(currentFrame);

    if (currentFrame > transitionDelay) {
      await drawLogo(currentFrame);
    }

    encoder.addFrame(ctx as any);
  };

  for (let i = 0; i < frames; i++) {
    await renderFrame(i);
    console.log(`Frame ${i + 1}/${frames}`);
  }

  encoder.finish();

  return output;
};
