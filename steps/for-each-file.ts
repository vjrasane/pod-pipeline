import { array, constant, Decoder, exact, lazy, nonEmptyString, optional } from "decoders";
import { readdirSync } from "fs";
import { join, parse } from "path";
import { Config } from "../config";
import { replaceVariables } from "../utils";
import * as Step from "./step";
import { Executor } from "./step";


interface ForEachFileStep {
    step: "for-each-file";
    name?: string;
    dir: string;
    steps: Step.Type[];
}

const decoder: Decoder<ForEachFileStep> = exact({
    step: constant("for-each-file"),
    name: optional(nonEmptyString),
    dir: nonEmptyString,
    steps: array(lazy(() => Step.decoder)),
});

const execute: Executor<ForEachFileStep> = async (
    step: ForEachFileStep,
    conf: Config,
    env: Record<string, any>
): Promise<void> => {
    const dir = replaceVariables(step.dir, env);
    const files = readdirSync(dir);
    // TODO: ok to do in parallel?
    for (let file of files) {
        const filePath = join(dir, file);
        const { ext, name } = parse(file);

        for (let fileStep of step.steps) {
            await Step.execute(fileStep, conf, {
                ...env,
                filepath: filePath,
                filename: name,
                ext,
            })
        }
    }
};



export { decoder, execute }