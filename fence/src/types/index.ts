export enum SkillLevel {
    Knows, Learning
}

export interface Skill {
    name: string
    desc: string
    level: SkillLevel
}

export interface DetectionRule {
    name: string
    pattern: string
    fileTypes: string[]
}