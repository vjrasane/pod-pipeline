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
  googleCredentialsFile: string;
  googleTokenFile: string;
}

interface AdobeConfig {
  adobeStockUsername: string;
  adobeStockPassword: string;
}

interface ShutterstockConfig {
  shutterstockUsername: string;
  shutterstockPassword: string;
}

interface EtsyConfig {
  etsyCredentialsFile: string;
  etsyTokenFile: string;
}

export {
  Config,
  OpenAiConfig,
  DiscordConfig,
  GoogleApiConfig,
  AdobeConfig,
  ShutterstockConfig,
  EtsyConfig,
};
