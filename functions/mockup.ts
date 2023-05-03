import { spawn } from "child_process";
import { join, parse, resolve, sep } from "path";
import Semaphore from "semaphore-promise";
import { tmpdir } from "os";
import { promisify } from "util";
import { copyFile, existsSync, readFileSync, writeFile } from "fs";
import { Config } from "../config";

type MockupParameters = {
  input: string;
  output: string;
  mockup: string;
};

const toUnixPath = (path: string): string => {
  return path.split(sep).join("/");
};

const semaphore = new Semaphore(1);

const mockup = async (
  { input, output, mockup }: MockupParameters,
  { workDir }: Config
): Promise<string> => {
  const inputPath = resolve(workDir, input);
  const outputPath = resolve(workDir, output);
  const mockupPath = resolve(workDir, mockup);

  if (existsSync(outputPath)) {
    console.log(`Mockup output ${outputPath} already exists`);
    return outputPath;
  }

  const { name } = parse(mockupPath);
  const mockupOutputFile = join(tmpdir(), `${name}-output.png`);

  const droplet = resolve(__dirname, "../photoshop/mockup.exe");
  const dummy = resolve(__dirname, "../photoshop/dummy.png");

  const release = await semaphore.acquire();

  const mockupEnvFile = join(tmpdir(), "mockup-env");
  const mockupEnv = `
    var MOCKUP_INPUT = '${toUnixPath(inputPath)}';
    var MOCKUP_FILE = '${toUnixPath(mockupPath)}';
  `;
  await promisify(writeFile)(mockupEnvFile, mockupEnv, "utf-8");

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

  await promisify(copyFile)(mockupOutputFile, outputPath);

  release();

  return outputPath;
};

export default mockup;
