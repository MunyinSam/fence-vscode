"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const detector_1 = require("../detector");
const generator_1 = require("../generator");
const writer_1 = require("../writer");
const program = new commander_1.Command();
program
    .command('init')
    .description('Scan project and create CLAUDE.md')
    .argument('<path>', 'path to project')
    .action(async (projectPath) => {
    let skills = await (0, detector_1.detect)(projectPath);
    let txtfile = (0, generator_1.generate)(skills);
    await (0, writer_1.write)(projectPath, txtfile);
});
program.parse();
//# sourceMappingURL=index.js.map