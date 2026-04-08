import { Command } from 'commander';
import chalk from 'chalk';
import { init, setLevel, status, off } from './commands';
import { LEVELS, SkillLevel } from './prompts';

const program = new Command();

program
  .name('fence')
  .description('Keep AI in learning mode — concepts only, no code generation')
  .version('1.0.0');

program
  .command('init')
  .description('Activate Fence in the current project')
  .option('-l, --level <level>', `Skill level (${LEVELS.join(', ')})`, 'intermediate')
  .action(async (options) => {
    if (!LEVELS.includes(options.level)) {
      console.log(chalk.red(`Invalid level. Choose: ${LEVELS.join(', ')}`));
      return;
    }
    await init(options.level as SkillLevel);
  });

program
  .command('set-level <level>')
  .description('Change the skill level in the current project')
  .action(async (level: string) => {
    await setLevel(level as SkillLevel);
  });

program
  .command('status')
  .description('Check if Fence is active in the current project')
  .action(async () => {
    await status();
  });

program
  .command('off')
  .description('Deactivate Fence in the current project')
  .action(async () => {
    await off();
  });

program.addHelpText('after', `
Examples:
  $ fence init                    Activate with intermediate level (default)
  $ fence init --level beginner   Activate with beginner level
  $ fence set-level advanced      Switch to advanced level
  $ fence status                  Check if Fence is active
  $ fence off                     Deactivate Fence
`);

program.parse(process.argv);