import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

/** Returns the configured git user email, or null if git is unavailable. */
export async function getCurrentUserEmail(cwd: string): Promise<string | null> {
    try {
        const { stdout } = await exec('git', ['config', 'user.email'], { cwd });
        return stdout.trim() || null;
    } catch {
        return null;
    }
}

/**
 * Returns the set of files (relative paths) that the given user has ever
 * committed to in this repo. Used as a fast file-level filter before
 * running per-line blame on individual files.
 *
 * Returns an empty set when git is unavailable or the repo has no history.
 * Callers should treat an empty set as "no filtering" (scan all files).
 */
export async function getMyCommittedFiles(cwd: string, userEmail: string): Promise<Set<string>> {
    try {
        const { stdout } = await exec('git', [
            'log',
            `--author=${userEmail}`,
            '--pretty=format:',
            '--name-only',
            '--diff-filter=ACMR',
        ], { cwd });

        const files = new Set<string>();
        for (const line of stdout.split('\n')) {
            const f = line.trim();
            if (f) {
                files.add(f);
                // Also store with forward slashes so Windows paths match
                files.add(f.replace(/\\/g, '/'));
            }
        }
        return files;
    } catch {
        return new Set();
    }
}

/**
 * Returns the 1-indexed line numbers in `filePath` that were last committed
 * by `userEmail` according to `git blame -e`.
 *
 * Returns null when the file is untracked or git is unavailable — callers
 * should treat null as "all lines owned by the current user" (e.g. a brand
 * new file the user just created).
 *
 * Example blame line format:
 *   abc12345 (<user@email.com> 2024-01-01 10:00:00 +0000  1) const x = 1;
 */
export async function getMyLineNumbers(
    filePath: string,
    cwd: string,
    userEmail: string,
): Promise<Set<number> | null> {
    try {
        const { stdout } = await exec('git', ['blame', '-e', '--', filePath], { cwd });
        const owned = new Set<number>();
        stdout.split('\n').forEach((line, i) => {
            const m = line.match(/<([^>]+)>/);
            if (m && m[1].toLowerCase() === userEmail.toLowerCase()) {
                owned.add(i + 1); // 1-indexed to match split('\n') index + 1
            }
        });
        return owned;
    } catch {
        // File not committed yet — treat all lines as owned by the current user
        return null;
    }
}
