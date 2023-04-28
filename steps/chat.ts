import { constant, DecoderType, exact, nonEmptyString, number, object, optional, string } from "decoders";
import { Configuration, CreateChatCompletionRequest, CreateChatCompletionResponse, OpenAIApi } from "openai";
import { Config } from "../config";
import { replaceVariables } from "../utils";
import { resolveSource, Source } from "./source";
import { Executor } from "./step";
import { Storage, writeStorage } from "./storage";

const decoder = exact({
    step: constant("chat"),
    name: optional(nonEmptyString),
    prompt: Source,
    output: Storage,
    maxTokens: number
})

type ChatStep = DecoderType<typeof decoder>

const execute: Executor<ChatStep> = async (step: ChatStep, config: Config, env: Record<string, any>) => {
    const { OPENAI_API_KEY, OPENAI_ORGANIZATION_ID } = object({
        OPENAI_API_KEY: nonEmptyString,
        OPENAI_ORGANIZATION_ID: nonEmptyString
    }).verify(env.env)

    const configuration = new Configuration({
        organization: OPENAI_ORGANIZATION_ID,
        apiKey: OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const prompt = replaceVariables(await resolveSource(step.prompt, env), env)

    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "user", content: prompt }
        ],
        max_tokens: 20,
        temperature: 0
    })
    const [{ message }] = response.data.choices

    await writeStorage(step.output, nonEmptyString.verify(message?.content), env)
}

export { decoder, execute }