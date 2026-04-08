import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { PROMPTS, SkillLevel, LEVELS } from './prompts';

const CLAUDE_FILE = 'CLAUDE.md';
const FENCE_MARKER = '<!-- fence-managed -->';

function getFilePath(): string {
  return path.join(process.cwd(), CLAUDE_FILE);
}

export async function init(level: SkillLevel = 'intermediate'): Promise<void> {
  const filePath = getFilePath();
  const exists = await fs.pathExists(filePath);

  if (exists) {
    const content = await fs.readFile(filePath, 'utf8');
    if (content.includes(FENCE_MARKER)) {
      console.log(chalk.yellow('Fence is already active in this project.'));
      console.log(chalk.gray('Run "fence set-level <level>" to change the skill level.'));
      return;
    }
    // Append to existing CLAUDE.md
    const newContent = content + '\n\n' + FENCE_MARKER + '\n' + PROMPTS[level];
    await fs.writeFile(filePath, newContent);
    console.log(chalk.green(`✓ Fence added to existing CLAUDE.md (${level} mode)`));
  } else {
    const content = FENCE_MARKER + '\n' + PROMPTS[level];
    await fs.writeFile(filePath, content);
    console.log(chalk.green(`✓ CLAUDE.md created (${level} mode)`));
  }

  console.log(chalk.gray('Claude Code will now follow learning mode rules in this project.'));
}

export async function setLevel(level: SkillLevel): Promise<void> {
  if (!LEVELS.includes(level)) {
    console.log(chalk.red(`Invalid level "${level}". Choose: ${LEVELS.join(', ')}`));
    return;
  }

  const filePath = getFilePath();
  const exists = await fs.pathExists(filePath);

  if (!exists) {
    console.log(chalk.red('Fence is not active in this project. Run "fence init" first.'));
    return;
  }

  const content = await fs.readFile(filePath, 'utf8');

  if (!content.includes(FENCE_MARKER)) {
    console.log(chalk.red('Fence is not active in this project. Run "fence init" first.'));
    return;
  }

  // Replace everything after the marker
  const before = content.split(FENCE_MARKER)[0];
  const newContent = before + FENCE_MARKER + '\n' + PROMPTS[level];
  await fs.writeFile(filePath, newContent);
  console.log(chalk.green(`✓ Skill level set to ${level}`));
}

export async function status(): Promise<void> {
  const filePath = getFilePath();
  const exists = await fs.pathExists(filePath);

  if (!exists) {
    console.log(chalk.gray('Fence is not active in this project.'));
    return;
  }

  const content = await fs.readFile(filePath, 'utf8');

  if (!content.includes(FENCE_MARKER)) {
    console.log(chalk.gray('Fence is not active in this project.'));
    return;
  }

  // Detect current level
  let currentLevel = 'unknown';
  for (const level of LEVELS) {
    if (content.includes(`Learning Mode (${level.charAt(0).toUpperCase() + level.slice(1)})`)) {
      currentLevel = level;
      break;
    }
  }

  console.log(chalk.green('✓ Fence is active'));
  console.log(chalk.gray(`  Skill level: ${currentLevel}`));
  console.log(chalk.gray(`  File: ${filePath}`));
}

export async function off(): Promise<void> {
  const filePath = getFilePath();
  const exists = await fs.pathExists(filePath);

  if (!exists) {
    console.log(chalk.gray('Fence is not active in this project.'));
    return;
  }

  const content = await fs.readFile(filePath, 'utf8');

  if (!content.includes(FENCE_MARKER)) {
    console.log(chalk.gray('Fence is not active in this project.'));
    return;
  }

  // Remove fence section
  const before = content.split(FENCE_MARKER)[0].trimEnd();

  if (before.length === 0) {
    // Fence was the entire file — delete it
    await fs.remove(filePath);
    console.log(chalk.green('✓ Fence removed (CLAUDE.md deleted)'));
  } else {
    // Fence was appended — restore the original content
    await fs.writeFile(filePath, before + '\n');
    console.log(chalk.green('✓ Fence removed from CLAUDE.md'));
  }

  console.log(chalk.gray('Claude Code is back to normal in this project.'));
}