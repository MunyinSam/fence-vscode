import fs from 'node:fs/promises';
import * as path from 'path';

export async function write(projectPath: string, content: string): Promise<void> {
    await fs.writeFile(path.join(projectPath, 'CLAUDE.md'), content, 'utf-8');
}