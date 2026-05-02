import simpleGit from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

export interface LineRange {
  start: number; // 1-indexed, inclusive
  end: number;   // 1-indexed, inclusive
}

// Returns the git config user.email for the repo containing filePath.
// Returns empty string if git is unavailable or not configured.
export async function getAuthorEmail(filePath: string): Promise<string> {
  try {
    const git = simpleGit({ baseDir: path.dirname(filePath) });
    return (await git.raw(['config', 'user.email'])).trim();
  } catch {
    return '';
  }
}

// Returns the line ranges in filePath authored by the current git user.
// Falls back to the full file if: not a git repo, file is uncommitted,
// git is not installed, or the user email can't be determined.
export async function getAuthoredLines(filePath: string): Promise<LineRange[]> {
  const totalLines = countLines(filePath);
  const allLines: LineRange[] = [{ start: 1, end: totalLines }];

  if (totalLines === 0) return allLines;

  try {
    const git = simpleGit({ baseDir: path.dirname(filePath) });

    const userEmail = (await git.raw(['config', 'user.email'])).trim();
    if (!userEmail) return allLines;

    const blameOutput = await git.raw(['blame', '--porcelain', filePath]);
    const authoredLineNumbers = parseBlame(blameOutput, userEmail);

    // No lines matched — could be a solo repo where the scan email differs,
    // or every line is from a teammate. Fall back so the scan still runs.
    if (authoredLineNumbers.length === 0) return allLines;

    return mergeIntoRanges(authoredLineNumbers);
  } catch {
    // Catches: not a git repo, file not yet committed, git not installed
    return allLines;
  }
}

// ── Porcelain parser ───────────────────────────────────────────────────────
//
// Porcelain format per line in the blamed file:
//
//   <40-hex> <src-line> <result-line> [<group-size>]   ← commit header
//   author <name>                                        ← only on first
//   author-mail <email>                                  ← occurrence of
//   ...other metadata...                                 ← this commit hash
//   \t<line content>                                     ← always present
//
// Subsequent lines from the same commit repeat only the header, no metadata.
// We cache email by commit hash so repeated lines are resolved correctly.

function parseBlame(output: string, userEmail: string): number[] {
  const lines = output.split('\n');
  const lineAuthors = new Map<number, string>(); // result-line → email
  const commitEmails = new Map<string, string>(); // commit hash → email
  let currentCommit = '';
  let currentLine = 0;

  for (const line of lines) {
    // Commit header: 40-hex + source line + result line (+ optional group size)
    const header = line.match(/^([0-9a-f]{40}) \d+ (\d+)/);
    if (header) {
      currentCommit = header[1];
      currentLine = parseInt(header[2], 10);
      // If we've seen this commit before, email is already cached
      const known = commitEmails.get(currentCommit);
      if (known) lineAuthors.set(currentLine, known);
      continue;
    }

    // author-mail only appears on first occurrence of a commit hash
    const emailLine = line.match(/^author-mail <(.+)>/);
    if (emailLine) {
      const email = emailLine[1];
      commitEmails.set(currentCommit, email);
      lineAuthors.set(currentLine, email);
    }
  }

  return Array.from(lineAuthors.entries())
    .filter(([, email]) => email === userEmail)
    .map(([lineNum]) => lineNum)
    .sort((a, b) => a - b);
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Turns [1, 2, 3, 7, 8, 12] into [{start:1,end:3}, {start:7,end:8}, {start:12,end:12}]
function mergeIntoRanges(lines: number[]): LineRange[] {
  if (lines.length === 0) return [];

  const ranges: LineRange[] = [];
  let start = lines[0];
  let end = lines[0];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === end + 1) {
      end = lines[i];
    } else {
      ranges.push({ start, end });
      start = lines[i];
      end = lines[i];
    }
  }
  ranges.push({ start, end });
  return ranges;
}

function countLines(filePath: string): number {
  try {
    return fs.readFileSync(filePath, 'utf8').split('\n').length;
  } catch {
    return 0;
  }
}
