"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadSkills = LoadSkills;
exports.saveSkills = saveSkills;
const types_1 = require("../types");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const path = __importStar(require("path"));
const STORE_PATH = path.join(node_os_1.default.homedir(), '.fence', 'skills.json');
// ---------------------------------------------------------------------------
// Decay
// ---------------------------------------------------------------------------
// Confidence loses ~0.5% per day of inactivity.
// After 30 days  → ~86% of original
// After 90 days  → ~64%  (may drop from Knows to Learning)
// After 180 days → ~41%
const DECAY_RATE = 0.005;
function decayedConfidence(storedConfidence, lastSeenAt) {
    const days = (Date.now() - new Date(lastSeenAt).getTime()) / 86_400_000;
    return Math.round(storedConfidence * Math.pow(1 - DECAY_RATE, days));
}
// ---------------------------------------------------------------------------
// Edit bonus
// ---------------------------------------------------------------------------
// Each save event that includes a skill boosts confidence slightly.
// log2 scale so early saves matter most: 1 save → +7, 5 saves → +15 (cap).
function editBonus(editCount) {
    return Math.min(15, Math.round(Math.log2(editCount + 1) * 7));
}
// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------
function migrate(raw) {
    return {
        name: String(raw.name ?? ''),
        language: String(raw.language ?? 'Unknown'),
        level: raw.level === 0 || raw.level === types_1.SkillLevel.Knows ? types_1.SkillLevel.Knows : types_1.SkillLevel.Learning,
        confidence: typeof raw.confidence === 'number' ? raw.confidence : (raw.level === 0 ? 70 : 30),
        usageCount: typeof raw.usageCount === 'number' ? raw.usageCount : 0,
        editCount: typeof raw.editCount === 'number' ? raw.editCount : 0,
        lastSeenAt: typeof raw.lastSeenAt === 'string' ? raw.lastSeenAt : new Date().toISOString(),
    };
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/** Load skills, apply decay, and apply edit bonus so confidence reflects
 *  both inactivity and how often the user has actively worked on each skill. */
async function LoadSkills() {
    try {
        const raw = await promises_1.default.readFile(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        return parsed.map(entry => {
            const skill = migrate(entry);
            const decayed = decayedConfidence(skill.confidence, skill.lastSeenAt);
            const bonus = editBonus(skill.editCount);
            const effective = Math.min(100, decayed + bonus);
            return {
                ...skill,
                confidence: effective,
                level: effective >= 60 ? types_1.SkillLevel.Knows : types_1.SkillLevel.Learning,
            };
        });
    }
    catch {
        return [];
    }
}
/** Merge a fresh scan into the global store.
 *  Each call increments editCount by 1 for every skill found in the scan,
 *  representing one save event (or one manual init run) of observed evidence. */
async function saveSkills(skills) {
    await promises_1.default.mkdir(path.dirname(STORE_PATH), { recursive: true });
    // Load raw stored skills without decay so we don't double-decay
    let stored = [];
    try {
        const raw = await promises_1.default.readFile(STORE_PATH, 'utf-8');
        stored = JSON.parse(raw).map(migrate);
    }
    catch { /* first run */ }
    for (const skill of skills) {
        const idx = stored.findIndex(s => s.name === skill.name && s.language === skill.language);
        if (idx === -1) {
            stored.push({ ...skill, editCount: 1 });
        }
        else {
            const prev = stored[idx];
            const newConfidence = Math.max(prev.confidence, skill.confidence);
            stored[idx] = {
                ...prev,
                confidence: newConfidence,
                usageCount: prev.usageCount + skill.usageCount,
                editCount: prev.editCount + 1, // each merge = one more save event
                lastSeenAt: skill.lastSeenAt, // reset the decay clock
                level: newConfidence >= 60 ? types_1.SkillLevel.Knows : types_1.SkillLevel.Learning,
            };
        }
    }
    await promises_1.default.writeFile(STORE_PATH, JSON.stringify(stored, null, 2));
}
//# sourceMappingURL=index.js.map