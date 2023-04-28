import yargs from "yargs";
import dotenv from "dotenv"

export default () => {
    const argv = yargs(process.argv.slice(2))
        .options({
            input: { type: "string", demandOption: true, alias: "i" },
        })
        .parseSync();

    dotenv.config()
    return argv
}