import { Config } from "../config";
import { glob } from "glob";
import download from "download";
import { join, parse, resolve } from "path";
import decompress from "decompress";
import { spawn } from "child_process";
import { existsSync, mkdtempSync, rmdirSync } from "fs";
import Semaphore from "semaphore-promise";

type UspcaleParameters = {
  input: string;
  output: string;
};

const upscalerNeuralNetwork = "realesrgan-ncnn-vulkan";

const getExecutable = async (dir: string): Promise<string | undefined> => {
  const files = await glob(
    `${upscalerNeuralNetwork}*/${upscalerNeuralNetwork}.exe`,
    { cwd: dir }
  );
  if (!files.length) return;
  return files[0];
};

// TODO: other operating systems
const downloadUrl =
  "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip";

const downloadExecutable = async (dir: string): Promise<void> => {
  await download(downloadUrl, dir);
  const { name, base } = parse(downloadUrl);
  const dest = join(dir, base);
  await decompress(dest, name);
};

const initExecutable = async (dir: string): Promise<string> => {
  const executable = await getExecutable(dir);
  if (!executable) await downloadExecutable(dir);
  if (!executable) throw new Error("No executable found after download!");
  return executable;
};

const semaphore = new Semaphore(1);

const upscale = async (
  { input, output }: UspcaleParameters,
  { workDir }: Config
): Promise<string> => {
  const outputPath = resolve(workDir, output);

  if (existsSync(outputPath)) {
    console.log(`Upscale output ${outputPath} already exists`);
    return outputPath;
  }

  const executable = await initExecutable(workDir);
  const release = await semaphore.acquire();
  const child = spawn(
    executable,
    [
      "-i",
      resolve(workDir, input),
      "-o",
      outputPath,
      "-s",
      "4",
      "-n",
      "realesrgan-x4plus",
      "-v",
    ],
    {
      stdio: ["pipe", process.stdout, process.stderr],
    }
  );

  await new Promise((resolve, reject) => {
    child.on("exit", (code) =>
      code !== 0 ? reject(code) : resolve(outputPath)
    );
  });

  release();
  return outputPath;
};

const doubleUpscale = async (
  { input, output }: UspcaleParameters,
  config: Config
): Promise<string> => {
  const tmpDir = mkdtempSync("upscale-");
  const tmp = await upscale(
    {
      input,
      output: join(tmpDir, parse(input).base),
    },
    config
  );

  const result = await upscale(
    {
      input: tmp,
      output,
    },
    config
  );
  rmdirSync(tmpDir);
  return result;
};

export default upscale;
