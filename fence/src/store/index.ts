import { Skill, SkillLevel } from '../types';
import fs from 'node:fs/promises';
import os from 'node:os';
import * as path from 'path';

const STORE_PATH = path.join(os.homedir(), '.fence', 'skills.json');

/** Migrate a raw JSON entry from the old format (had `desc`, numeric level) */
function migrate(raw: Record<string, unknown>): Skill {
    return {
        name: String(raw.name ?? ''),
        language: String(raw.language ?? 'Unknown'),
        level: raw.level === 0 || raw.level === SkillLevel.Knows ? SkillLevel.Knows : SkillLevel.Learning,
        confidence: typeof raw.confidence === 'number' ? raw.confidence : (raw.level === 0 ? 70 : 30),
        usageCount: typeof raw.usageCount === 'number' ? raw.usageCount : 0,
    };
}

export async function LoadSkills(): Promise<Skill[]> {
    try {
        const raw = await fs.readFile(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as Record<string, unknown>[];
        return parsed.map(migrate);
    } catch {
        return [];
    }
}

export async function saveSkills(skills: Skill[]): Promise<void> {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });

    const stored = await LoadSkills();

    for (const skill of skills) {
        const idx = stored.findIndex(s => s.name === skill.name && s.language === skill.language);

        if (idx === -1) {
            stored.push(skill);
        } else {
            // Accumulate evidence: keep the highest confidence seen across scans.
            // If the new scan raises confidence enough to graduate to Knows, promote.
            const prev = stored[idx];
            const newConfidence = Math.max(prev.confidence, skill.confidence);
            const newCount = prev.usageCount + skill.usageCount;
            stored[idx] = {
                ...prev,
                confidence: newConfidence,
                usageCount: newCount,
                level: newConfidence >= 60 ? SkillLevel.Knows : SkillLevel.Learning,
            };
        }
    }

    await fs.writeFile(STORE_PATH, JSON.stringify(stored, null, 2));
}
