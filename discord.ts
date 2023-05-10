import { API } from "@discordjs/core";
import axios from "axios";
import { nonEmptyString } from "decoders";
import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  REST,
} from "discord.js";
import dotenv from "dotenv";
import { writeFile } from "fs";
import { promisify } from "util";

dotenv.config();

const config = {
  discordBotId: nonEmptyString.verify(process.env.DISCORD_BOT_ID),
  discordBotToken: nonEmptyString.verify(process.env.DISCORD_BOT_TOKEN),
  // discordGuildId: nonEmptyString.verify(process.env.DISCORD_GUILD_ID),
  discordGuildName: nonEmptyString.verify(process.env.DISCORD_GUILD_NAME),
  // discordChannelName: nonEmptyString.verify(process.env.DISCORD_CHANNEL_NAME),
};

const rest = new REST({ version: "10" }).setToken(config.discordBotToken);

const api = new API(rest);

// (async () => {
//   const channels = await api.guilds.getChannels(config.discordGuildId);
//   const channel = channels.find(
//     (channel) => channel.name === config.discordChannelName
//   );
//   if (!channel)
//     throw new Error("No such Discord channel: " + config.discordChannelName);
//   if (channel.type !== ChannelType.GuildText)
//     throw new Error("Not a text channel: " + channel.type);

//   await api.channels.createMessage(channel.id, { content: "/info" });
//   // console.log("channel", channel);
//   // channel.
// })();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);

  const guild = client.guilds.cache.find(
    (guild) => guild.name === config.discordGuildName
  );
  if (!guild)
    throw new Error("No such Discord guild: " + config.discordGuildName);

  // const channel = guild.channels.cache.find(
  //   (channel) => channel.name === config.discordChannelName
  // );
  // if (!channel)
  //   throw new Error("No such Discord channel: " + config.discordChannelName);

  // if (channel.type !== ChannelType.GuildText)
  //   throw new Error("Not a text channel: " + channel.type);

  // channel.send("Hello there!");

  // client.destroy();
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (reaction.emoji.name !== "✅") return;
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Failed to fetch reaction message: ", error);
      return;
    }
    const { emoji, message } = reaction;
    const { channel, content, attachments } = message;

    const match = new RegExp(/\*\*([^*]+)\*\*/).exec(message.content ?? "");
    if (!match) return;
    const prompt = match.at(1);
    if (!prompt) return;
    const image = attachments.at(0);
    if (!image) return;

    const response = await axios.get(image.url, {
      responseType: "arraybuffer",
    });

    await Promise.all([
      promisify(writeFile)("image.png", response.data),
      promisify(writeFile)("prompt.txt", prompt),
    ]);

    message.reply("saved!");

    // console.log(reaction.emoji);
    // console.log(reaction.message);
  }
});

client.login(config.discordBotToken);
