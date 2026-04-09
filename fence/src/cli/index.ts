import { Command } from 'commander';
import { detect } from '../detector';
import { generate } from '../generator';
import { write } from '../writer';

const program = new Command();

program
    .command('init')
    .description('Scan project and create CLAUDE.md')
    .argument('<path>', 'path to project', process.cwd())
    .action(async (projectPath) => {
        let skills = await detect(projectPath);
        let txtfile = generate(skills);
        await write(projectPath, txtfile);
    });

program.parse();
