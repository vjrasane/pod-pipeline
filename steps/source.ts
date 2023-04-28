import { constant, DecoderType, either, exact, nonEmptyString } from "decoders"
import { readFile } from "fs"
import { join } from "path"
import { promisify } from "util"
import { replaceVariables } from "../utils"

const FileSource = exact({
    source: constant("file"),
    path: nonEmptyString
})

const Source = either(
    nonEmptyString,
    FileSource
)

type Source = DecoderType<typeof Source>

const resolveSource = async (source: Source, env: Record<string, any>): Promise<string> => {
    if (typeof source === "string") return source
    switch (source.source) {
        case "file":
            const filePath = replaceVariables(join(env.workDir, source.path), env)
            return await promisify(readFile)(filePath, "utf-8")
    }
}

export { Source, resolveSource }