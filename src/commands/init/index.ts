import { Command } from 'commander';
import { handler } from './handler';

const registerCmd = (command: Command): void => {
  command
    .command('init')
    .description('Create a configuration file if it does not already exist.')
    .option('-c, --config <filepath>', 'Indicate the name of the configuration file', 'fcc.config.js')
    .action(handler);
};

export default registerCmd;
