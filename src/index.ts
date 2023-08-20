import { Command } from 'commander';
import registerInitCmd from '@commands/init';
import registerCheckCmd from '@commands/check';
import { getPackageJSON } from '@utils/index';

const program = new Command();
const packageJSON = getPackageJSON();
program.version(packageJSON.version);
program.description(packageJSON.description);

registerInitCmd(program);
registerCheckCmd(program);

program.parse(process.argv);
