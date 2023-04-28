

import dotenv from "dotenv"
import { Configuration, OpenAIApi } from "openai";


dotenv.config()

const configuration = new Configuration({
    organization: process.env.OPENAI_ORGANIZATION_ID,
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const main = async () => {

    // const response = await openai.listEngines();
    // console.log(response.data.data.filter(e => e.id.includes("gpt-3.5")))
    try {
        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "user", content: "Write a short 10-20 word description of an image with filename 'heppu_an_astronaut_running_through_the_a_corridor_in_a_spacesta_5b2de7d7-2adb-4d9b-a389-36ee31df2a9.png'. treat underscores as spaces. first word is a username, ignore it. ignore anything that looks like an identifier string." }
            ],
            max_tokens: 20,
            temperature: 0
        })
        console.log(JSON.stringify(response.data))
    } catch (error) {
        console.log(error)
    }
    // const response = await openai.createCompletion({
    //     model: "gpt-3.5-turbo",
    //     prompt: "Say this is a test",
    //     max_tokens: 7,
    //     temperature: 0
    // })

    // console.log(response.data)
}

main()