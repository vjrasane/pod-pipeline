interface Config {
  workDir: string;
}

interface OpenAiConfig {
  openAiApiKey: string;
  openAiOrganizationId: string;
}

interface DiscordConfig {
  discordBotToken: string;
}

interface GoogleApiConfig {
  credentialsFile: string;
  tokenFile: string;
}

interface AdobeConfig {
  adobeStockUsername: string;
  adobeStockPassword: string;
}

interface ShutterstockConfig {
  shutterstockUsername: string;
  shutterstockPassword: string;
}

export {
  Config,
  OpenAiConfig,
  DiscordConfig,
  GoogleApiConfig,
  AdobeConfig,
  ShutterstockConfig,
};
