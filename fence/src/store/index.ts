import { Skill } from "../types";
import fs from 'node:fs/promises';
import os from "node:os";
import * as path from 'path';

export async function LoadSkills(): Promise<Skill[]> {
    try {
        const storePath = path.join(os.homedir(), '.fence', 'skills.json');
        const skillsFile = await fs.readFile(storePath, 'utf-8');
        return JSON.parse(skillsFile) as Skill[]; 
    } catch (error) {
        return [];
    }
}

export async function saveSkills(skills: Skill[]): Promise<void> {
    await fs.mkdir(path.join(os.homedir(), '.fence'), { recursive: true });
    const storePath = path.join(os.homedir(), '.fence', 'skills.json');
    try {
        const storedSkills = await LoadSkills();

        for (let skill of skills) {
            let index = storedSkills.findIndex(s => s.name === skill.name);
            if (index === -1) {
                storedSkills.push(skill);
            } else if (skill.level === 0) {
                storedSkills[index].level = 0;
            }

        }
        console.log(storedSkills);
        fs.writeFile(storePath, JSON.stringify(storedSkills));
    } catch (error) {
        return;
    }
    return;
}

// const skills = [
//     { "name": "Async/Await", "desc": "async ", "level": 3 },
//     { "name": "Arrow Functions", "desc": "=>", "level": 0 },
//     { "name": "TypeScript Types", "desc": "interface ", "level": 0 },
//     { "name": "Destructuring", "desc": "const {", "level": 1 },
//     { "name": "Express Routes", "desc": "app.get(", "level": 1 }
// ];

// LoadSkills();
// saveSkills(skills);
// LoadSkills();