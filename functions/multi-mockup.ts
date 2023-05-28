import { spawn } from "child_process";
import { join, parse, resolve, sep } from "path";
import Semaphore from "semaphore-promise";
import { tmpdir } from "os";
import { promisify } from "util";
import { copyFile, existsSync, readFileSync, writeFile } from "fs";
import { Config } from "../config";
import { mapValues } from "lodash/fp";

const toUnixPath = (path: string): string => {
  return path.split(sep).join("/");
};

const semaphore = new Semaphore(1);

const MOCKUP_ENV_FILE = join(tmpdir(), "multi-mockup.env");

const droplet = resolve(__dirname, "../photoshop/multi-mockup.exe");
const dummy = resolve(__dirname, "../photoshop/dummy.png");

const multiMockup = async (
  inputs: Record<string, string>,
  output: string,
  mockup: string
): Promise<string> => {
  if (existsSync(output)) {
    console.log(`Mockup output ${output} already exists`);
    return output;
  }

  const { name } = parse(mockup);
  const mockupOutputFile = join(tmpdir(), `${name}-output.png`);

  const release = await semaphore.acquire();

  const mockupEnv = `
    var MOCKUP_INPUTS = ${JSON.stringify(mapValues(toUnixPath, inputs))};
    var MOCKUP_FILE = '${toUnixPath(mockup)}';
  `;
  await promisify(writeFile)(MOCKUP_ENV_FILE, mockupEnv, "utf-8");

  const child = spawn(droplet, [dummy], {
    stdio: ["pipe", process.stdout, process.stderr],
  });

  try {
    await new Promise((resolve, reject) => {
      child.on("exit", (code) =>
        code !== 0 ? reject(code) : resolve(undefined)
      );
    });
  } catch (err) {
    // photoshop returns with code 1
  }

  await promisify(copyFile)(mockupOutputFile, output);

  release();

  return output;
};

export default multiMockup;
