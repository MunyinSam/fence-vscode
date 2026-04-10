"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const detector_1 = require("../detector");
const generator_1 = require("../generator");
const writer_1 = require("../writer");
const store_1 = require("../store");
const program = new commander_1.Command();
program
    .command('init')
    .description('Scan project and create CLAUDE.md')
    .argument('<path>', 'path to project', process.cwd())
    .action(async (projectPath) => {
    const detected = await (0, detector_1.detect)(projectPath);
    await (0, store_1.saveSkills)(detected); // merge into global store
    const allSkills = await (0, store_1.LoadSkills)(); // get accumulated skills
    const content = (0, generator_1.generate)(allSkills); // generate from global
    await (0, writer_1.write)(projectPath, content); // write to project
});
program.parse();
//# sourceMappingURL=index.js.map