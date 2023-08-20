import pkgDir from 'pkg-dir';

export const rootPath = pkgDir.sync(__dirname) as string;
