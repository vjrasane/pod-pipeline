import yargs from "yargs";
import * as Step from "./steps/step"
import { Config } from "./config";
import dotenv from "dotenv"

const argv = yargs(process.argv.slice(2))
  .options({
    config: { type: "string", demandOption: true, alias: "c" },
    input: { type: "string", demandOption: true, alias: "i" },
  })
  .parseSync();

dotenv.config()

const config = readConfigFile(argv.config)

const environment = {
  cwd: process.cwd(),
  workDir: config.workDir ?? process.cwd(),
  input: argv.input,
  env: process.env
};

const main = async (conf: Config, env: Record<string, any>) => {
  // TODO ok to do in parallel?
  for (let step of conf.steps) {
    await Step.execute(step, conf, env)
  }
}

main(config, environment)
// config.steps.forEach(step);
