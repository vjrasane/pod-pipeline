import { array, constant, Decoder, either, exact, lazy, nonEmptyString, number, optional, string } from "decoders";
import { Config } from "../config";
import { replaceVariables } from "../utils";
import * as Step from "./step";
import { Executor } from "./step";


interface ForEachValueStep {
    step: "for-each-value";
    name?: string;
    values: (string | number)[];
    steps: Step.Type[];
}

const decoder: Decoder<ForEachValueStep> = exact({
    step: constant("for-each-value"),
    name: optional(nonEmptyString),
    values: array(either(string, number)),
    steps: array(lazy(() => Step.decoder)),
});

const execute: Executor<ForEachValueStep> = async (
    step: ForEachValueStep,
    conf: Config,
    env: Record<string, any>
): Promise<void> => {
    const values = replaceVariables(step.values, env)
    // TODO ok to do in parallel?
    for (let value of values) {
        for (let valueStep of step.steps) {
            await Step.execute(valueStep, conf, {
                ...env,
                value,
            })
        }
    }

};



export { decoder, execute }