interface Config {
  workDir: string;
}

interface OpenAiConfig {
  openAiApiKey: string;
  openAiOrganizationId: string;
}

interface DiscordConfig {
  discordBotId: string;
  discordBotToken: string;
  discordGuildName: string;
  discordChannelName: string;
}

interface GoogleApiConfig {
  credentialsFile: string;
  tokenFile: string;
}

export { Config, OpenAiConfig, DiscordConfig, GoogleApiConfig };
