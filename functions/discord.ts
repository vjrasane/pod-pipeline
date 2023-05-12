import { API } from "@discordjs/core";
import axios from "axios";
import { nonEmptyString } from "decoders";
import {
  AnyThreadChannel,
  Attachment,
  ChannelType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageReaction,
  Partials,
  REST,
} from "discord.js";
import dotenv from "dotenv";
import { mkdirSync, writeFile } from "fs";
import { compact, entries, fromPairs, truncate } from "lodash/fp";
import { dirname, resolve, join } from "path";
import { promisify } from "util";
import yargs from "yargs";
import { DiscordConfig } from "../config";

// const argv = yargs(process.argv.slice(2))
//   .options({
//     output: {
//       type: "string",
//       demandOption: false,
//       alias: "o",
//       default: resolve(process.cwd(), "discord-listener-output"),
//     },
//   })
//   .parseSync();

// const SUPPORTED_EMOJIS = {
//   checkmark: "✅",
// };

// const emojis: Record<string, string> = fromPairs(
//   compact(
//     argv.emoji.map((e) =>
//       e in SUPPORTED_EMOJIS
//         ? [e, SUPPORTED_EMOJIS[e as keyof typeof SUPPORTED_EMOJIS]]
//         : undefined
//     )
//   )
// );

// console.log(emojis);

// dotenv.config();

// const config = {
//   discordBotId: nonEmptyString.verify(process.env.DISCORD_BOT_ID),
//   discordBotToken: nonEmptyString.verify(process.env.DISCORD_BOT_TOKEN),
//   discordGuildName: nonEmptyString.verify(process.env.DISCORD_GUILD_NAME),
// };

// const rest = new REST({ version: "10" }).setToken(config.discordBotToken);

// const api = new API(rest);

// client.once(Events.ClientReady, (c) => {
//   console.log(`Ready! Logged in as ${c.user.tag}`);

//   const guild = client.guilds.cache.find(
//     (guild) => guild.name === config.discordGuildName
//   );
//   if (!guild)
//     throw new Error("No such Discord guild: " + config.discordGuildName);
// });
// "✅"

export type Message = {
  id: string;
  content: string | null;
  attachments: Collection<string, Attachment>;
};

export type Reaction = {
  message: Message;
  emoji: string | null;
};

export type ReactionListener = (
  reaction: Reaction,
  reply: (message: string) => Promise<void>
) => void;

type DiscordStartBotParameters = {
  onReaction: ReactionListener;
};

export const startBot = (
  { onReaction }: DiscordStartBotParameters,
  { discordBotToken }: DiscordConfig
) => {
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
  });

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Failed to fetch reaction message: ", error);
        return;
      }
    }

    console.log(
      `Received reaction '${reaction.emoji.name}' to message '${reaction.message.content}'`
    );
    const { emoji, message } = reaction;
    const { attachments } = message;

    let thread: AnyThreadChannel;
    const reply = async (msg: string) => {
      if (!thread) {
        thread = await message.startThread({
          name: truncate(
            { length: 100 },
            message.content ?? String(message.createdTimestamp)
          ),
          autoArchiveDuration: 60,
        });
      }
      await thread.send(msg);
    };

    onReaction(
      {
        message: {
          id: message.id,
          content: message.content,
          attachments,
        },
        emoji: emoji.name,
      },
      reply
    );
  });

  client.login(discordBotToken);
};
