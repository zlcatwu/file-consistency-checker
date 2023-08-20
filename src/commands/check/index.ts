import { Command } from 'commander';

const registerCmd = (command: Command): void => {
  command
    .command('check')
    .description('Verify the consistency of files.')
    .option('-c, --config <filepath>', '', 'fcc.config.js')
    .action(() => {});
};

export default registerCmd;
export type * from './types';
