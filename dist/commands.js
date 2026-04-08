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
exports.init = init;
exports.setLevel = setLevel;
exports.status = status;
exports.off = off;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const prompts_1 = require("./prompts");
const CLAUDE_FILE = 'CLAUDE.md';
const FENCE_MARKER = '<!-- fence-managed -->';
function getFilePath() {
    return path.join(process.cwd(), CLAUDE_FILE);
}
async function init(level = 'intermediate') {
    const filePath = getFilePath();
    const exists = await fs.pathExists(filePath);
    if (exists) {
        const content = await fs.readFile(filePath, 'utf8');
        if (content.includes(FENCE_MARKER)) {
            console.log(chalk_1.default.yellow('Fence is already active in this project.'));
            console.log(chalk_1.default.gray('Run "fence set-level <level>" to change the skill level.'));
            return;
        }
        // Append to existing CLAUDE.md
        const newContent = content + '\n\n' + FENCE_MARKER + '\n' + prompts_1.PROMPTS[level];
        await fs.writeFile(filePath, newContent);
        console.log(chalk_1.default.green(`✓ Fence added to existing CLAUDE.md (${level} mode)`));
    }
    else {
        const content = FENCE_MARKER + '\n' + prompts_1.PROMPTS[level];
        await fs.writeFile(filePath, content);
        console.log(chalk_1.default.green(`✓ CLAUDE.md created (${level} mode)`));
    }
    console.log(chalk_1.default.gray('Claude Code will now follow learning mode rules in this project.'));
}
async function setLevel(level) {
    if (!prompts_1.LEVELS.includes(level)) {
        console.log(chalk_1.default.red(`Invalid level "${level}". Choose: ${prompts_1.LEVELS.join(', ')}`));
        return;
    }
    const filePath = getFilePath();
    const exists = await fs.pathExists(filePath);
    if (!exists) {
        console.log(chalk_1.default.red('Fence is not active in this project. Run "fence init" first.'));
        return;
    }
    const content = await fs.readFile(filePath, 'utf8');
    if (!content.includes(FENCE_MARKER)) {
        console.log(chalk_1.default.red('Fence is not active in this project. Run "fence init" first.'));
        return;
    }
    // Replace everything after the marker
    const before = content.split(FENCE_MARKER)[0];
    const newContent = before + FENCE_MARKER + '\n' + prompts_1.PROMPTS[level];
    await fs.writeFile(filePath, newContent);
    console.log(chalk_1.default.green(`✓ Skill level set to ${level}`));
}
async function status() {
    const filePath = getFilePath();
    const exists = await fs.pathExists(filePath);
    if (!exists) {
        console.log(chalk_1.default.gray('Fence is not active in this project.'));
        return;
    }
    const content = await fs.readFile(filePath, 'utf8');
    if (!content.includes(FENCE_MARKER)) {
        console.log(chalk_1.default.gray('Fence is not active in this project.'));
        return;
    }
    // Detect current level
    let currentLevel = 'unknown';
    for (const level of prompts_1.LEVELS) {
        if (content.includes(`Learning Mode (${level.charAt(0).toUpperCase() + level.slice(1)})`)) {
            currentLevel = level;
            break;
        }
    }
    console.log(chalk_1.default.green('✓ Fence is active'));
    console.log(chalk_1.default.gray(`  Skill level: ${currentLevel}`));
    console.log(chalk_1.default.gray(`  File: ${filePath}`));
}
async function off() {
    const filePath = getFilePath();
    const exists = await fs.pathExists(filePath);
    if (!exists) {
        console.log(chalk_1.default.gray('Fence is not active in this project.'));
        return;
    }
    const content = await fs.readFile(filePath, 'utf8');
    if (!content.includes(FENCE_MARKER)) {
        console.log(chalk_1.default.gray('Fence is not active in this project.'));
        return;
    }
    // Remove fence section
    const before = content.split(FENCE_MARKER)[0].trimEnd();
    if (before.length === 0) {
        // Fence was the entire file — delete it
        await fs.remove(filePath);
        console.log(chalk_1.default.green('✓ Fence removed (CLAUDE.md deleted)'));
    }
    else {
        // Fence was appended — restore the original content
        await fs.writeFile(filePath, before + '\n');
        console.log(chalk_1.default.green('✓ Fence removed from CLAUDE.md'));
    }
    console.log(chalk_1.default.gray('Claude Code is back to normal in this project.'));
}
