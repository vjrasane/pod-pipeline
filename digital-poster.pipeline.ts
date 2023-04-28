import { nonEmptyString } from "decoders"
import { readdirSync, readFileSync } from "fs"
import { assignInAllWith } from "lodash/fp"
import chat from "./functions/chat"
import forEachFile from "./functions/for-each-file"
import init from "./init"
import naming from "./prompts/naming"

const { input } = init()

const config = {
    workDir: process.cwd(),
    openAiApiKey: nonEmptyString.verify(process.env.OPENAI_API_KEY),
    openAiOrganizationId: nonEmptyString.verify(process.env.OPENAI_ORGANIZATION_ID)
}

const main = async () => {
    forEachFile({ dir: input }, async (file) => {
        const name = chat({ prompt: naming(file.name, 25), maxTokens: 25 }, config)
    })
}

main()
