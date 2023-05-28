import { maybe, nonEmptyString } from "decoders";
import { Message, ReactionListener, startBot } from "./functions/discord";
import dotenv from "dotenv";
import axios from "axios";
import { join, resolve } from "path";
import { mkdir, rm, writeFile } from "fs";
import { promisify } from "util";
import { stockImagePipeline } from "./pipelines/stock-image.pipeline";
import { digitialPaintingPipeline } from "./pipelines/digital-painting.pipeline";

dotenv.config();

const workDir = maybe(nonEmptyString, process.cwd()).verify(
  process.env.WORK_DIR
);

const config = {
  workDir,
  openAiApiKey: nonEmptyString.verify(process.env.OPENAI_API_KEY),
  openAiOrganizationId: nonEmptyString.verify(
    process.env.OPENAI_ORGANIZATION_ID
  ),
  adobeStockUsername: nonEmptyString.verify(process.env.ADOBE_STOCK_USERNAME),
  adobeStockPassword: nonEmptyString.verify(process.env.ADOBE_STOCK_PASSWORD),
  shutterstockUsername: nonEmptyString.verify(
    process.env.SHUTTERSTOCK_USERNAME
  ),
  shutterstockPassword: nonEmptyString.verify(
    process.env.SHUTTERSTOCK_PASSWORD
  ),
  discordBotToken: nonEmptyString.verify(process.env.DISCORD_BOT_TOKEN),
  credentialsFile: resolve(workDir, "./credentials.json"),
  tokenFile: resolve(workDir, "./token.json"),
};

const downloadImage = async (
  message: Message,
  outputDir: string
): Promise<string> => {
  const { id, content, attachments } = message;
  const image = attachments.at(0);
  if (!image)
    throw new Error(`No image found in message: '${content}' (${id})`);

  const response = await axios.get(image.url, {
    responseType: "arraybuffer",
  });

  await promisify(mkdir)(outputDir, { recursive: true });
  const imageFile = join(outputDir, `${id}.png`);
  await promisify(writeFile)(imageFile, response.data);
  return imageFile;
};

const getPrompt = (message: Message): string => {
  const { id, content } = message;
  const match = new RegExp(/\*\*([^*]+)\*\*/).exec(message.content ?? "");
  const prompt = match?.at(1);
  if (!prompt)
    throw new Error(`No prompt found in message: '${content}' (${id})`);
  return prompt;
};

const onStockReaction: ReactionListener = async (
  reaction,
  reply
): Promise<void> => {
  const { message } = reaction;
  const outputDir = join(config.workDir, message.id);
  try {
    const image = await downloadImage(message, outputDir);
    const prompt = getPrompt(message);
    await reply(`Downloaded image`);
    const iterable = stockImagePipeline(image, prompt, outputDir, config);
    for await (const status of iterable) {
      await reply(status);
    }
    await promisify(rm)(outputDir, { force: true, recursive: true });
    await reply("Done!");
  } catch (err) {
    await reply(`Failed to process: ${err}`);
  }
};

const onPaintingReaction: ReactionListener = async (
  reaction,
  reply
): Promise<void> => {
  const { message } = reaction;
  const outputDir = join(config.workDir, message.id);
  try {
    const image = await downloadImage(message, outputDir);
    const prompt = getPrompt(message);
    await reply(`Downloaded image`);
    const iterable = digitialPaintingPipeline(image, prompt, outputDir, config);
    for await (const status of iterable) {
      await reply(status);
    }

    await reply("Done!");
  } catch (err) {
    await reply(`Failed to process: ${err}`);
  }
};

const onReaction: ReactionListener = async (reaction, reply): Promise<void> => {
  const { emoji } = reaction;
  switch (emoji) {
    case "📈":
      return onStockReaction(reaction, reply);
    case "🖼️":
      return onPaintingReaction(reaction, reply);
    default:
      console.log("Unsupprted emoji reaction: " + reaction.emoji);
  }
};

startBot({ onReaction }, config);
