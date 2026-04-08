"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const commands_1 = require("./commands");
const prompts_1 = require("./prompts");
const program = new commander_1.Command();
program
    .name('fence')
    .description('Keep AI in learning mode — concepts only, no code generation')
    .version('1.0.0');
program
    .command('init')
    .description('Activate Fence in the current project')
    .option('-l, --level <level>', `Skill level (${prompts_1.LEVELS.join(', ')})`, 'intermediate')
    .action(async (options) => {
    if (!prompts_1.LEVELS.includes(options.level)) {
        console.log(chalk_1.default.red(`Invalid level. Choose: ${prompts_1.LEVELS.join(', ')}`));
        return;
    }
    await (0, commands_1.init)(options.level);
});
program
    .command('set-level <level>')
    .description('Change the skill level in the current project')
    .action(async (level) => {
    await (0, commands_1.setLevel)(level);
});
program
    .command('status')
    .description('Check if Fence is active in the current project')
    .action(async () => {
    await (0, commands_1.status)();
});
program
    .command('off')
    .description('Deactivate Fence in the current project')
    .action(async () => {
    await (0, commands_1.off)();
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
