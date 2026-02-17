import { execSync } from 'child_process';

import type { CodeChange } from '@/src/types/doc-sync';

export class GitAnalyzer {
  getCodeChanges(baseBranch: string, targetBranch: string): CodeChange[] {
    try {
      const gitStatusResult = execSync(`git diff --name-status ${baseBranch}..${targetBranch}`, {
        encoding: 'utf8',
        cwd: process.cwd(),
      });

      const gitStatusOutput = String(gitStatusResult);

      if (gitStatusOutput.trim() === '') {
        return [];
      }

      const statusLines = gitStatusOutput.trim().split('\n');
      const changes: CodeChange[] = [];

      for (const statusLine of statusLines) {
        try {
          const { changeType, filePath } = this.parseGitStatusLine(statusLine);

          if (!this.isSourceCodeFile(filePath)) {
            continue;
          }

          const diffResult = execSync(`git diff ${baseBranch}..${targetBranch} -- "${filePath}"`, {
            encoding: 'utf8',
            cwd: process.cwd(),
          });

          const diffOutput = String(diffResult);
          const { linesAdded, linesRemoved } = this.countDiffLines(diffOutput);

          const change: CodeChange = {
            filePath,
            changeType,
            linesAdded,
            linesRemoved,
            diffContent: diffOutput,
            isSourceCode: true,
          };

          changes.push(change);
        } catch {
          throw new Error('Failed to parse git status output');
        }
      }

      return changes;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('bad revision')) {
        const branchName = message.includes(baseBranch) ? baseBranch : targetBranch;
        throw new Error(`Branch '${branchName}' does not exist`);
      } else if (message.includes('not a git repository')) {
        throw new Error('Git repository not found or not initialized');
      } else if (message.includes('does not have any commits')) {
        throw new Error('Repository has no commits');
      } else if (message.includes('Failed to parse git status output')) {
        throw error;
      }

      throw error;
    }
  }

  isSourceCodeFile(filePath: string): boolean {
    if (
      filePath.includes('__tests__') ||
      filePath.includes('.test.') ||
      filePath.includes('.spec.')
    ) {
      return false;
    }

    if (filePath.includes('node_modules')) {
      return false;
    }

    const excludePatterns = [
      'package.json',
      'tsconfig.json',
      '.gitignore',
      'README.md',
      'LICENSE',
      '.env',
    ];

    if (excludePatterns.some((pattern) => filePath.endsWith(pattern))) {
      return false;
    }

    return filePath.endsWith('.ts') || filePath.endsWith('.js');
  }

  parseGitStatusLine(statusLine: string): {
    changeType: 'added' | 'modified' | 'deleted';
    filePath: string;
  } {
    const parts = statusLine.split('\t');
    if (parts.length < 2) {
      throw new Error('Invalid git status line format');
    }

    const status = parts[0];
    let filePath = parts[1];

    if (status !== undefined && status.startsWith('R') && parts.length >= 3) {
      filePath = parts[2] ?? filePath;
    }

    let changeType: 'added' | 'modified' | 'deleted';

    const statusChar = status !== undefined ? status[0] : undefined;

    switch (statusChar) {
      case 'A':
        changeType = 'added';
        break;
      case 'M':
        changeType = 'modified';
        break;
      case 'D':
        changeType = 'deleted';
        break;
      case 'R':
        changeType = 'modified';
        break;
      default:
        throw new Error('Invalid git status line format');
    }

    return { changeType, filePath: filePath ?? '' };
  }

  countDiffLines(diff: string): { linesAdded: number; linesRemoved: number } {
    const lines = diff.split('\n');
    let linesAdded = 0;
    let linesRemoved = 0;

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        linesAdded++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        linesRemoved++;
      }
    }

    return { linesAdded, linesRemoved };
  }
}
