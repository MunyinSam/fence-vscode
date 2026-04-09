import fs from 'node:fs/promises';
import * as path from 'path';
import { DetectionRule, Skill, SkillLevel } from "../types";

export async function detect(projectPath: string): Promise<Skill[]> {
    let files = await fs.readdir(projectPath, {recursive: true});
    
    const pattern = /\.ts$|\.js$|\.py$|\.tsx$|\.jsx$/;
    const codeFiles = files.filter(f => pattern.test(f));
    
    const withStats = await Promise.all(
        codeFiles.map(async f => ({
            file: f,
            stat: await fs.stat(path.join(projectPath, f))
        }))
    );

    const onlyFiles = withStats.filter(f => f.stat.isFile());
    const filesContent = await Promise.all(
        onlyFiles.map(async f => ({
            file: f.file,
            text: await fs.readFile(path.join(projectPath, f.file), 'utf-8')
        }))
    );

    const rules: DetectionRule[] = [
        { name: "React Hooks", pattern: "useState", fileTypes: [".tsx", ".jsx"] },
        { name: "Async/Await", pattern: "async ", fileTypes: [".ts", ".js", ".tsx", ".jsx"] },
        { name: "TypeScript Types", pattern: "interface ", fileTypes: [".ts", ".tsx"] },
        { name: "Express Routes", pattern: "app.get(", fileTypes: [".ts", ".js"] },
        { name: "Arrow Functions", pattern: "=>", fileTypes: [".ts", ".js", ".tsx", ".jsx"] },
        { name: "Destructuring", pattern: "const {", fileTypes: [".ts", ".js", ".tsx", ".jsx"] },
    ];

    let results: Skill[] = [];

    for (const rule of rules) {
        // console.log(`${key}: ${value.name}`);
        let ruleName = rule.name;
        let rulePattern = rule.pattern;
        let ruleFileTypes = rule.fileTypes;

        let count = 0;

        for (const f of filesContent) {
            const hasFileType = ruleFileTypes.some(ft => f.file.includes(ft));
            if (hasFileType) {
                count += f.text.split(rulePattern).length - 1;
            }
        }
        if (count >= 5) {
            results.push({ name: ruleName, desc: rulePattern, level: SkillLevel.Knows })
        }
        else if (count > 0) {
            results.push({ name: ruleName, desc: rulePattern, level: SkillLevel.Learning })
        }
    }

    // console.log(filesContent);
    return results;
}

// detect("D:/Code/Personal/fence-vscode/fence/src").then(console.log);
