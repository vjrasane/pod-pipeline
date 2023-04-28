import { DecoderType, either, lazy } from "decoders";
import * as ForEachFile from "./for-each-file";
import * as ForEachValue from "./for-each-value";
import * as Crop from "./crop"
import * as Chat from "./chat"
import { Config } from "../config";

const decoder = either(
    lazy(() => ForEachFile.decoder),
    lazy(() => ForEachValue.decoder),
    lazy(() => Crop.decoder),
    lazy(() => Chat.decoder)
);

type Type = DecoderType<typeof decoder>;

type Executor<S extends Type> = (step: S, config: Config, env: Record<string, any>) => Promise<void>

const execute: Executor<Type> = (step: Type, conf: Config, env: Record<string, any>): Promise<void> => {
    switch (step.step) {
        case "crop":
            return Crop.execute(step, conf, env);
        case "chat":
            return Chat.execute(step, conf, env)
        case "for-each-file":
            return ForEachFile.execute(step, conf, env);
        case "for-each-value":
            return ForEachValue.execute(step, conf, env);
    }
};

export { Executor, Type, decoder, execute }