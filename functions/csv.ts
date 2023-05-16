import { createObjectCsvWriter } from "csv-writer";
import { Config } from "../config";
import { dirname, resolve } from "path";
import { existsSync, mkdirSync } from "fs";

type CsvWriteParameters<T extends Record<string, any>> = {
  header: { id: keyof T; title: string }[];
  output: string;
  records: T[];
};

export const writeCsv = async <T extends Record<string, any>>({
  header,
  output,
  records,
}: CsvWriteParameters<T>): Promise<string> => {
  const writer = createObjectCsvWriter({
    path: output,
    header: header as any[],
  });

  await writer.writeRecords(records as any);

  return output;
};
