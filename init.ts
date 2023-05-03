import yargs from "yargs";
import dotenv from "dotenv";
import { resolve } from "path";

export type Options = {
  input: string;
  output: string;
};

export default (): Options => {
  const argv = yargs(process.argv.slice(2))
    .options({
      input: { type: "string", demandOption: true, alias: "i" },
    })
    .option({
      output: {
        type: "string",
        demandOption: false,
        alias: "o",
        default: resolve(process.cwd(), "output"),
      },
    })
    .parseSync();

  dotenv.config();
  return argv;
};
