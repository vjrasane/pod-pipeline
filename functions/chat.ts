import {
  ChatCompletionResponseMessage,
  Configuration,
  OpenAIApi,
} from "openai";
import { OpenAiConfig } from "../config";

const initOpenAi = ({ openAiApiKey, openAiOrganizationId }: OpenAiConfig) => {
  const configuration = new Configuration({
    organization: openAiOrganizationId,
    apiKey: openAiApiKey,
  });
  return new OpenAIApi(configuration);
};

type ChatParameters = {
  prompt: string;
  maxTokens: number;
};

// type Message = { role: "user" | "assistant" | "system"; content: string };

export const chat = async (
  { prompt, maxTokens }: ChatParameters,
  config: OpenAiConfig
): Promise<string> => {
  const response = await initOpenAi(config).createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    temperature: 0,
  });
  const [{ message }] = response.data.choices;

  const answer = message?.content;
  if (!answer) throw new Error("Empty answer from chat completion");
  return answer;
};

type ConverseParameters = {
  conversation: ChatCompletionResponseMessage[];
  maxTokens: number;
};

export const converse = async (
  { conversation, maxTokens }: ConverseParameters,
  config: OpenAiConfig
): Promise<ChatCompletionResponseMessage> => {
  const response = await initOpenAi(config).createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: conversation,
    max_tokens: maxTokens,
    temperature: 0,
  });
  const [{ message }] = response.data.choices;
  if (!message) throw new Error("Empty answer from chat completion");
  return message;
};

export class Conversation {
  private openai: OpenAIApi;
  private messages: ChatCompletionResponseMessage[];

  constructor(
    config: OpenAiConfig,
    systemMessages: { role: "system"; content: string }[] = []
  ) {
    this.openai = initOpenAi(config);
    this.messages = systemMessages;
  }

  say = async (
    content: string,
    maxTokens: number,
    role: "user" | "system" = "user"
  ): Promise<ChatCompletionResponseMessage> => {
    this.messages = [...this.messages, { role, content }];
    const response = await this.openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: this.messages,
      max_tokens: maxTokens,
      temperature: 0,
    });
    const [{ message }] = response.data.choices;
    if (!message) throw new Error("No answer from chat completion");
    this.messages = [...this.messages, message];
    return message;
  };
}
