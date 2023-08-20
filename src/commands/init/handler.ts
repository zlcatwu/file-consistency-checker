import { InitCmdOptions } from './types';
import fs from 'fs-extra';
import path from 'path';

const configFileTemplate = `
/**
 * @type {import('file-consistency-checker').CheckConfig}
 */
const config = {
    checkingMaps: {},
};

module.exports = config;
`;

// check whether the config exists
// if exists, throw an error with the full filepath
// if not exists, create one
export const handler = ({ config: filepath }: InitCmdOptions): void => {
  const fullFilePath = path.join(process.cwd(), filepath);

  if (fs.existsSync(fullFilePath)) {
    throw new Error(`Config file already exists: ${fullFilePath}`);
  } else {
    fs.writeFileSync(fullFilePath, configFileTemplate);
  }
};
