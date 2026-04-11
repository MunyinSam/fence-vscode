import { Command } from 'commander';
import { detect } from '../detector';
import { generate } from '../generator';
import { write } from '../writer';
import { LoadSkills, saveSkills } from '../store';

const program = new Command();

program
    .command('init')
    .description('Scan project and create CLAUDE.md')
    .argument('[path]', 'path to project (defaults to current directory)')
    .action(async (projectPath = process.cwd()) => {
        const detected = await detect(projectPath);
        await saveSkills(detected);           // merge into global store
        const allSkills = await LoadSkills(); // get accumulated skills
        const content = generate(allSkills);  // generate from global
        await write(projectPath, content);    // write to project
    });

program.parse();
