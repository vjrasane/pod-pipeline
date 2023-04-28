import { readdirSync } from "fs"
import { join, parse } from "path"


type ForEachFileParameters = {
    dir: string
}

type FileDescriptor = {
    path: string,
    name: string,
    ext: string
}

export default async <T>({ dir }: ForEachFileParameters, callback: (file: FileDescriptor) => Promise<T>): Promise<T[]> => {
    const files = readdirSync(dir)
    return Promise.all(files.map(file => {
        const filePath = join(dir, file)
        return callback({
            ...parse(file),
            path: filePath
        })
    }))
}