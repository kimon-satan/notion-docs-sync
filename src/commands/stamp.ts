/* eslint-disable no-console */
import { execSync } from 'child_process';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { resolveConfig } from '../lib/config';
import { replaceTimestampInContent } from '../lib/timestamp-utils';

export async function stampCommand(): Promise<void> {
  const config = resolveConfig();
  const docsDir = config.analysis.docsDir;

  console.log(`Checking for modified docs in: ${docsDir}`);

  const modifiedFiles = getModifiedMarkdownFiles(docsDir);

  if (modifiedFiles.length === 0) {
    console.log('No modified markdown files found.');
    return;
  }

  const now = new Date();
  let stamped = 0;

  for (const filePath of modifiedFiles) {
    try {
      const fullPath = join(process.cwd(), filePath);
      const content = await readFile(fullPath, 'utf-8');
      const updated = replaceTimestampInContent(content, now);

      if (updated !== content) {
        await writeFile(fullPath, updated, 'utf-8');
        console.log(`  Stamped: ${filePath}`);
        stamped++;
      } else {
        console.log(`  Skipped (no timestamp line): ${filePath}`);
      }
    } catch (error) {
      console.error(`  Failed to stamp ${filePath}:`, error);
    }
  }

  console.log(`\nStamped ${stamped} file(s) with timestamp: ${now.toISOString()}`);
}

function getModifiedMarkdownFiles(docsDir: string): string[] {
  try {
    const output = execSync(`git status --porcelain -- ${docsDir}`, {
      encoding: 'utf-8',
    });

    return output
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => line.slice(3).trim())
      .filter((file) => file.endsWith('.md'));
  } catch {
    console.error('Failed to run git status. Are you in a git repository?');
    return [];
  }
}
