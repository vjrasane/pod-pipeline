import { readdirSync } from "fs";
import { get, mapValues, noop } from "lodash/fp";
import sharp from "sharp";
import { extname, join, parse } from "path";

const replaceStringVariables = (
  str: string,
  env: Record<string, any>
): string => {
  const matches = str.match(/{([^}]*)}/g);
  if (!matches?.length) return str;
  let replaced = str;
  matches.forEach((match) => {
    const variable = match.substring(1, match.length - 1);
    const value = get(variable, env);
    if (value == null)
      throw new Error(`Cannot replace '${variable}': not found in env`);
    replaced = replaced.replace(match, value);
  });

  return replaced;
};

export const replaceVariables = <T>(value: T, env: Record<string, any>): T => {
  if (Array.isArray(value))
    return value.map((item) => replaceVariables(item, env)) as T;
  if (typeof value === "string") return replaceStringVariables(value, env) as T;
  if (typeof value === "object")
    return mapValues((val) => replaceVariables(val, env), value) as T;
  return value;
};

// export const download = async (
//   url: string,
//   output: string
// ): Promise<string> => {
//   const outputStream = createWriteStream(output);
//   const response: IncomingMessage = await new Promise((resolve) =>
//     https.get(url, (res) => resolve(res))
//   );
//   response.pipe(outputStream);
//   return new Promise((resolve, reject) =>
//     outputStream.on("finish", () => {
//       outputStream.close();
//       resolve(output);
//     })
//   );
// };

export const getImageDimensions = async (
  file: string
): Promise<[number, number]> => {
  const inputInstance = sharp(file);
  const metadata = await inputInstance.metadata();

  const imageWidth = metadata.width ?? 0;
  const imageHeight = metadata.height ?? 0;
  return [imageWidth, imageHeight];
};

export type FileDescriptor = {
  path: string;
  name: string;
  base: string;
  ext: string;
  dir: string;
};

export const getTaggedFileName = (
  file: FileDescriptor | string,
  tag: string
) => {
  const { name, ext } = typeof file === "object" ? file : parse(file);
  return `${name}-${tag}${ext}`;
};

export const setFileExtension = (
  file: FileDescriptor | string,
  ext: string
) => {
  const { name } = typeof file === "object" ? file : parse(file);
  return `${name}${ext.startsWith(".") ? ext : `.${ext}`}`;
};

export const getFileDescriptor = (filePath: string) => {
  return {
    ...parse(filePath),
    path: filePath,
  };
};

export const getDirectoryImage = (
  filePath: string
): FileDescriptor | undefined => {
  const files = readdirSync(filePath);
  const imageFile = files.find((file) =>
    [".jpg", ".jpeg", ".png"].includes(extname(file))
  );
  return imageFile ? getFileDescriptor(join(filePath, imageFile)) : undefined;
};

export const getDirectoryText = (
  filePath: string
): FileDescriptor | undefined => {
  const files = readdirSync(filePath);
  const textFile = files.find((file) => [".txt"].includes(extname(file)));
  return textFile ? getFileDescriptor(join(filePath, textFile)) : undefined;
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const combineAsyncIterables = async function* <T>(
  asyncIterables: AsyncIterable<T>[]
): AsyncGenerator<T> {
  const asyncIterators = Array.from(asyncIterables, (o) =>
    o[Symbol.asyncIterator]()
  );
  const results = [];
  let count = asyncIterators.length;
  const never: Promise<never> = new Promise(noop);
  const getNext = (asyncIterator: AsyncIterator<T>, index: number) =>
    asyncIterator.next().then((result) => ({ index, result }));

  const nextPromises = asyncIterators.map(getNext);
  try {
    while (count) {
      const { index, result } = await Promise.race(nextPromises);
      if (result.done) {
        nextPromises[index] = never;
        results[index] = result.value;
        count--;
      } else {
        nextPromises[index] = getNext(asyncIterators[index], index);
        yield result.value;
      }
    }
  } finally {
    for (const [index, iterator] of asyncIterators.entries()) {
      if (nextPromises[index] != never && iterator.return != null) {
        // no await here - see https://github.com/tc39/proposal-async-iteration/issues/126
        void iterator.return();
      }
    }
  }
  return results;
};
