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
// Edit bonus
// ---------------------------------------------------------------------------

// Each save event that includes a skill boosts confidence slightly.
// log2 scale so early saves matter most: 1 save → +7, 5 saves → +15 (cap).
function editBonus(editCount: number): number {
    return Math.min(15, Math.round(Math.log2(editCount + 1) * 7));
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

function migrate(raw: Record<string, unknown>): Skill {
    return {
        name:       String(raw.name ?? ''),
        language:   String(raw.language ?? 'Unknown'),
        level:      raw.level === 0 || raw.level === SkillLevel.Knows ? SkillLevel.Knows : SkillLevel.Learning,
        confidence: typeof raw.confidence === 'number' ? raw.confidence : (raw.level === 0 ? 70 : 30),
        usageCount: typeof raw.usageCount === 'number' ? raw.usageCount : 0,
        editCount:  typeof raw.editCount  === 'number' ? raw.editCount  : 0,
        lastSeenAt: typeof raw.lastSeenAt === 'string' ? raw.lastSeenAt : new Date().toISOString(),
    };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Load skills, apply decay, and apply edit bonus so confidence reflects
 *  both inactivity and how often the user has actively worked on each skill. */
export async function LoadSkills(): Promise<Skill[]> {
    try {
        const raw    = await fs.readFile(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as Record<string, unknown>[];
        return parsed.map(entry => {
            const skill    = migrate(entry);
            const decayed  = decayedConfidence(skill.confidence, skill.lastSeenAt);
            const bonus    = editBonus(skill.editCount);
            const effective = Math.min(100, decayed + bonus);
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

/** Merge a fresh scan into the global store.
 *  Each call increments editCount by 1 for every skill found in the scan,
 *  representing one save event (or one manual init run) of observed evidence. */
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
            stored.push({ ...skill, editCount: 1 });
        } else {
            const prev          = stored[idx];
            const newConfidence = Math.max(prev.confidence, skill.confidence);
            stored[idx] = {
                ...prev,
                confidence: newConfidence,
                usageCount: prev.usageCount + skill.usageCount,
                editCount:  prev.editCount + 1,   // each merge = one more save event
                lastSeenAt: skill.lastSeenAt,      // reset the decay clock
                level:      newConfidence >= 60 ? SkillLevel.Knows : SkillLevel.Learning,
            };
        }
    }

    await fs.writeFile(STORE_PATH, JSON.stringify(stored, null, 2));
}
