import path from 'path';
import fs from 'fs-extra';
import { rootPath } from '@utils/path';

// basic field in package.json
export type PackageJSON = {
  name: string;
  version: string;
  description: string;
};

let cache: PackageJSON | null = null;
export const getPackageJSON = (): PackageJSON => {
  if (cache) {
    return cache;
  }

  const packageJsonPath = path.join(rootPath, 'package.json');

  try {
    const packageJson = fs.readJSONSync(packageJsonPath);
    cache = packageJson;
    return packageJson;
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error}`);
  }
};
