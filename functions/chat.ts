import {
  ChatCompletionResponseMessage,
  Configuration,
  OpenAIApi,
} from "openai";
import { OpenAiConfig } from "../config";
import { sleep } from "../utils";

export const initOpenAi = ({
  openAiApiKey,
  openAiOrganizationId,
}: OpenAiConfig) => {
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
    openai: OpenAIApi,
    messages: ChatCompletionResponseMessage[] = []
  ) {
    this.openai = openai;
    this.messages = messages;
  }

  duplicate = (): Conversation => {
    return new Conversation(this.openai, this.messages);
  };

  append = (...messages: ChatCompletionResponseMessage[]): Conversation => {
    this.messages = [...this.messages, ...messages];
    return this;
  };

  say = async (
    content: string,
    maxTokens: number,
    role: "user" | "system" = "user",
    retries = 5,
    retryDelay = 1000
  ): Promise<ChatCompletionResponseMessage> => {
    try {
      const messages = [...this.messages, { role, content }];
      const response = await this.openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages,
        max_tokens: maxTokens,
        temperature: 0,
      });
      const [{ message }] = response.data.choices;
      if (!message) throw new Error("No answer from chat completion");
      this.messages = [...messages, message];
      return message;
    } catch (err) {
      if (retries <= 0) throw err;
      await sleep(retryDelay);
      return this.say(content, maxTokens, role, retries - 1, retryDelay * 2);
    }
  };
}
