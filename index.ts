import {
  exact,
  nonEmptyString,
  tuple,
  either,
  oneOf,
  optional,
  constant,
  string,
  number,
  array,
  lazy,
  DecoderType,
  Decoder,
  Scalar,
} from "decoders";
import { readFileSync, readdirSync } from "fs";
import yargs from "yargs";
import { replaceVariables } from "./utils";
import { join, parse } from "path";

const argv = yargs(process.argv.slice(2))
  .options({
    config: { type: "string", demandOption: true, alias: "c" },
    input: { type: "string", demandOption: true, alias: "i" },
  })
  .parseSync();

const aspectRatio = (delimiter: string): Decoder<[number, number]> =>
  string
    .transform((str) => str.split(delimiter))
    .transform((arr) => arr.map((s) => parseInt(s)))
    .then(tuple(number, number).decode);

const AspectRatio = string.refine(
  (str) => either(aspectRatio("x"), aspectRatio(":")).decode(str).ok,
  "Invalid aspect ratio"
);

interface ForEachFileStep {
  step: "for-each-file";
  name?: string;
  dir: string;
  steps: Step[];
}

const ForEachFileStep: Decoder<ForEachFileStep> = exact({
  step: constant("for-each-file"),
  name: optional(nonEmptyString),
  dir: nonEmptyString,
  steps: array(lazy(() => Step)),
});

interface ForEachValueStep {
  step: "for-each-value";
  name?: string;
  values: (string | number)[];
  steps: Step[];
}

const ForEachValueStep: Decoder<ForEachValueStep> = exact({
  step: constant("for-each-value"),
  name: optional(nonEmptyString),
  values: array(either(string, number)),
  steps: array(lazy(() => Step)),
});

const Step = either(
  lazy(() => ForEachFileStep),
  lazy(() => ForEachValueStep),
  lazy(() => CropStep)
);

type Step = DecoderType<typeof Step>;

const CropStep = exact({
  step: constant("crop"),
  name: optional(nonEmptyString),
  aspectRatio: nonEmptyString,
  input: nonEmptyString,
  output: nonEmptyString,
});

type CropStep = DecoderType<typeof CropStep>;

const Config = exact({
  workDir: optional(nonEmptyString),
  steps: array(lazy(() => Step)),
});

const config = Config.verify(JSON.parse(readFileSync(argv.config, "utf-8")));

const environment = {
  cwd: process.cwd(),
  workDir: config.workDir,
  input: argv.input,
};

const runForEachFileStep = (
  step: ForEachFileStep,
  env: Record<string, any>
) => {
  const dir = replaceVariables(step.dir, environment);
  const files = readdirSync(dir);
  return files.forEach((file) => {
    const filePath = join(dir, file);
    const { ext, name } = parse(file);
    step.steps.forEach((fileStep) =>
      runStep(fileStep, {
        ...env,
        filepath: filePath,
        filename: name,
        ext,
      })
    );
  });
};

const runForEachValueStep = (
  step: ForEachValueStep,
  env: Record<string, any>
) => {
  const values = step.values.map((v) => replaceVariables(String(v), env));
  return values.forEach((value) => {
    step.steps.forEach((valueStep) =>
      runStep(valueStep, {
        ...env,
        value,
      })
    );
  });
};

const runCropStep = (step: CropStep, env: Record<string, any>) => {};

const runStep = (step: Step, env: Record<string, any>) => {
  switch (step.step) {
    case "crop":
      return;
    case "for-each-file":
      return runForEachFileStep(step, env);
    case "for-each-value":
      return runForEachValueStep(step, env);
  }
};

// config.steps.forEach(step);
