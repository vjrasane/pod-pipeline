import { constant, DecoderType, either, exact, nonEmptyString } from "decoders"
import { writeFile } from "fs/promises"
import { join } from "path"
import { promisify } from "util"


const FileStorage = exact({
    storage: constant("file"),
    path: nonEmptyString
})

const VariableStorage = exact({
    storage: constant("variable"),
    name: nonEmptyString
})

const Storage = either(
    FileStorage,
    VariableStorage
)

type Storage = DecoderType<typeof Storage>

const writeStorage = async (storage: Storage, value: string | number, env: Record<string, any>) => {
    switch (storage.storage) {
        case "file":
            const filePath = join(env.workDir, storage.path)
            return await promisify(writeFile)(filePath, String(value), {})
        case "variable":
            env.vars = env.vars ?? {}
            env.vars[storage.name] = value
            return
    }
}

export { Storage, writeStorage }