import { createObjectCsvWriter } from "csv-writer";
import { Config } from "../config";
import { dirname, resolve } from "path";
import { existsSync, mkdirSync } from "fs";

type CsvWriteParameters<T extends Record<string, any>> = {
  header: { id: keyof T; title: string }[];
  output: string;
  records: T[];
};

export const writeCsv = async <T extends Record<string, any>>(
  { header, output, records }: CsvWriteParameters<T>,
  { workDir }: Config
): Promise<string> => {
  const outputPath = resolve(workDir, output);

  const outputDir = dirname(outputPath);
  mkdirSync(outputDir, { recursive: true });

  const writer = createObjectCsvWriter({
    path: outputPath,
    header: header as any[],
  });

  await writer.writeRecords(records as any);

  return outputPath;
};
