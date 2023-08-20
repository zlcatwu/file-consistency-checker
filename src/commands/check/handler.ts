import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { CheckCmdOptions, CheckConfig, CheckOutput, CheckMapItem, CheckMapItemOutput } from './types';
import { DefaultOutputFilename } from 'const';
import crypto from 'crypto';

export const handler = async ({ config: filepath }: CheckCmdOptions): Promise<void> => {
  const config = await getCheckConfig({ filepath });
  const curOutput = await getCurCheckOutput({ config });
  const lastOutput = await getLastOutput({ filepath: config.output });
  await fs.writeJSON(config.output, lastOutput);
};

// Check whether the output file exists.
// Returns null if it does not exist.
// Returns the content of the file if it exists.
export async function getLastOutput({ filepath }: { filepath: string }): Promise<CheckOutput | null> {
  try {
    const outputFilePath = path.join(filepath, DefaultOutputFilename);
    const exists = await fs.pathExists(outputFilePath);

    if (!exists) {
      return null;
    }

    const content = await fs.readJSON(outputFilePath);
    return content as CheckOutput;
  } catch (error) {
    console.error(`Error reading check output: ${error}`);
    return null;
  }
}

// Import the config file using require.
// Throw an error if the config file does not exist.
export async function getCheckConfig({ filepath }: { filepath: string }): Promise<Required<CheckConfig>> {
  try {
    const resolvedPath = path.resolve(filepath);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require(resolvedPath);
    if (!config.output) {
      config.output = path.join(path.dirname(resolvedPath), DefaultOutputFilename);
    }
    return config;
  } catch (error) {
    console.error(`Failed to load check config from file: ${filepath}`);
    throw error;
  }
}

export async function getCurCheckOutput({ config }: { config: CheckConfig }): Promise<CheckOutput> {
  const result: CheckOutput = {};
  for (const task in config.checkingMaps) {
    const checkMapItemOutput = await getCurCheckMapItemOutput({ config: config.checkingMaps[task] });
    result[task] = checkMapItemOutput;
  }
  return result;
}

export async function getCurCheckMapItemOutput({ config }: { config: CheckMapItem }): Promise<CheckMapItemOutput> {
  const baseFiles = await getCurCheckMapItemBaseFiles({ config });
  const result: CheckMapItemOutput = {};
  await Promise.all(
    baseFiles.map(async (baseFile) => {
      const baseMD5 = await calcMD5({ filepath: path.resolve(config.base, baseFile) });
      result[baseFile] = {
        base: { hash: baseMD5 },
        correspond: {},
      };
    }),
  );

  for (const correspondName in config.correspond) {
    await Promise.all(
      baseFiles.map(async (baseFile) => {
        const filepath = path.resolve(config.correspond[correspondName], baseFile);
        const isFileExists = await fs.pathExists(filepath);
        result[baseFile].correspond[correspondName] = isFileExists
          ? {
              hash: await calcMD5({ filepath }),
              baseHash: result[baseFile].base.hash,
            }
          : null;
      }),
    );
  }

  return result;
}

// Get all the files under config.base
// Filter the files using config.includeFn
export async function getCurCheckMapItemBaseFiles({ config }: { config: CheckMapItem }): Promise<string[]> {
  const baseFiles = await glob(config.base, { cwd: path.dirname(config.base) });
  const filteredFiles = baseFiles.filter((file) => config.includeFn({ relativeFilepath: file }));
  return filteredFiles;
}

// Calculate MD5 of the file
export async function calcMD5({ filepath }: { filepath: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filepath);

    stream.on('data', (data) => {
      hash.update(data);
    });

    stream.on('end', () => {
      const md5 = hash.digest('hex');
      resolve(md5);
    });

    stream.on('error', (error) => {
      reject(error);
    });
  });
}
