import { Configuration, OpenAIApi } from "openai";
import { OpenAiConfig } from "../config"


type ChatParameters = {
    prompt: string,
    maxTokens: number
}


export default async ({ prompt, maxTokens }: ChatParameters, {
    openAiApiKey,
    openAiOrganizationId
}: OpenAiConfig): Promise<string> => {
    const configuration = new Configuration({
        organization: openAiOrganizationId,
        apiKey: openAiApiKey,
    });
    const openai = new OpenAIApi(configuration);

    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "user", content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0
    })
    const [{ message }] = response.data.choices

    const answer = message?.content
    if (!answer)
        throw new Error("Empty answer from chat completion")
    return answer
}