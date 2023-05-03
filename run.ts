import { stat, statSync } from "fs";
import init, { Options } from "./init";
import { resolve } from "path";
import forEachFile from "./functions/for-each-file";
import { FileDescriptor, getFileDescriptor } from "./utils";

type Callback = (file: FileDescriptor, opts: Options) => Promise<void>;

export default async (callback: Callback): Promise<void> => {
  const opts = init();
  const inputPath = resolve(process.cwd(), opts.input);
  const stats = statSync(inputPath);
  if (stats.isDirectory()) {
    await forEachFile({ dir: inputPath }, (file) => callback(file, opts));
    return;
  }
  return callback(getFileDescriptor(inputPath), opts);
};
