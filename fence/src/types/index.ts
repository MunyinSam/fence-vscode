export enum SkillLevel {
    Knows,    // 0
    Learning  // 1
}

export interface Skill {
    name: string
    language: string
    level: SkillLevel
    confidence: number   // 0–100, raw stored value
    usageCount: number
    editCount: number    // number of save events that contributed to this skill
    lastSeenAt: string   // ISO date string
}

export interface DetectionRule {
    name: string
    language: string
    patterns: string[]   // regex pattern strings (case-insensitive applied per file)
    fileTypes: string[]
    weight: number       // 1–3; higher = stronger signal per match
}
