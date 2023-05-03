import { readdirSync } from "fs";
import { join, parse } from "path";
import { FileDescriptor } from "../utils";

type ForEachFileParameters = {
  dir: string;
};

export default async <T>(
  { dir }: ForEachFileParameters,
  callback: (file: FileDescriptor) => Promise<T>
): Promise<T[]> => {
  const files = readdirSync(dir);
  return Promise.all(
    files.map((file) => {
      const filePath = join(dir, file);
      return callback({
        ...parse(file),
        path: filePath,
      });
    })
  );
};
