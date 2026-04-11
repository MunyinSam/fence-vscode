import { Skill, SkillLevel } from '../types';
import fs from 'node:fs/promises';
import os from 'node:os';
import * as path from 'path';

const STORE_PATH = path.join(os.homedir(), '.fence', 'skills.json');

// ---------------------------------------------------------------------------
// Decay
// ---------------------------------------------------------------------------

// Confidence loses ~0.5% per day of inactivity.
// After 30 days  → ~86% of original
// After 90 days  → ~64%  (may drop from Knows to Learning)
// After 180 days → ~41%
const DECAY_RATE = 0.005;

function decayedConfidence(storedConfidence: number, lastSeenAt: string): number {
    const days = (Date.now() - new Date(lastSeenAt).getTime()) / 86_400_000;
    return Math.round(storedConfidence * Math.pow(1 - DECAY_RATE, days));
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

function migrate(raw: Record<string, unknown>): Skill {
    return {
        name:        String(raw.name ?? ''),
        language:    String(raw.language ?? 'Unknown'),
        level:       raw.level === 0 || raw.level === SkillLevel.Knows ? SkillLevel.Knows : SkillLevel.Learning,
        confidence:  typeof raw.confidence === 'number' ? raw.confidence : (raw.level === 0 ? 70 : 30),
        usageCount:  typeof raw.usageCount === 'number' ? raw.usageCount : 0,
        lastSeenAt:  typeof raw.lastSeenAt === 'string' ? raw.lastSeenAt : new Date().toISOString(),
    };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Load skills and apply decay so returned confidence reflects inactivity. */
export async function LoadSkills(): Promise<Skill[]> {
    try {
        const raw = await fs.readFile(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as Record<string, unknown>[];
        return parsed.map(entry => {
            const skill = migrate(entry);
            const effective = decayedConfidence(skill.confidence, skill.lastSeenAt);
            return {
                ...skill,
                confidence: effective,
                level: effective >= 60 ? SkillLevel.Knows : SkillLevel.Learning,
            };
        });
    } catch {
        return [];
    }
}

/** Merge a fresh scan into the global store. */
export async function saveSkills(skills: Skill[]): Promise<void> {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });

    // Load raw stored skills without decay so we don't double-decay
    let stored: Skill[] = [];
    try {
        const raw = await fs.readFile(STORE_PATH, 'utf-8');
        stored = (JSON.parse(raw) as Record<string, unknown>[]).map(migrate);
    } catch { /* first run */ }

    for (const skill of skills) {
        const idx = stored.findIndex(s => s.name === skill.name && s.language === skill.language);

        if (idx === -1) {
            stored.push(skill);
        } else {
            const prev = stored[idx];
            // New scan refreshes lastSeenAt and boosts confidence
            const newConfidence = Math.max(prev.confidence, skill.confidence);
            stored[idx] = {
                ...prev,
                confidence:  newConfidence,
                usageCount:  prev.usageCount + skill.usageCount,
                lastSeenAt:  skill.lastSeenAt,   // reset the decay clock
                level:       newConfidence >= 60 ? SkillLevel.Knows : SkillLevel.Learning,
            };
        }
    }

    await fs.writeFile(STORE_PATH, JSON.stringify(stored, null, 2));
}
