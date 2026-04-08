import { Skill, SkillLevel } from "../types";

export function generate(skills: Skill[]): string {
    const learningSkills = skills.filter(f => f.level === SkillLevel.Learning);
    const knownedSkills = skills.filter(f => f.level === SkillLevel.Knows);

    const output = `## What I Know
    ${knownedSkills.map(s => `- ${s.name}`).join('\n')}

    ## Still Learning
    ${learningSkills.map(s => `- ${s.name}`).join('\n')}
    `;

    return output;

}