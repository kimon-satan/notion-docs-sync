import type { CodeChange } from '../types/doc-sync';
import { execSync } from 'child_process';

/**
 * Analyzes git changes between branches to identify code modifications
 */
export class GitAnalyzer {
  /**
   * Get code changes between two git branches
   */
  async getCodeChanges(baseBranch: string, targetBranch: string): Promise<CodeChange[]> {
    try {
      // Get list of changed files between branches
      const gitStatusResult = execSync(`git diff --name-status ${baseBranch}..${targetBranch}`, {
        encoding: 'utf8',
        cwd: process.cwd(),
      });

      // Handle both Buffer and string returns (for testing)
      const gitStatusOutput = String(gitStatusResult);

      if (!gitStatusOutput.trim()) {
        return [];
      }

      const statusLines = gitStatusOutput.trim().split('\n');
      const changes: CodeChange[] = [];

      for (const statusLine of statusLines) {
        try {
          const { changeType, filePath } = this.parseGitStatusLine(statusLine);

          // Filter for source code files only
          if (!this.isSourceCodeFile(filePath)) {
            continue;
          }

          // Get the full diff for this file
          const diffResult = execSync(`git diff ${baseBranch}..${targetBranch} -- "${filePath}"`, {
            encoding: 'utf8',
            cwd: process.cwd(),
          });

          // Handle both Buffer and string returns (for testing)
          const diffOutput = String(diffResult);

          // Count lines added and removed
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
        } catch (error) {
          // If we can't parse a single line, throw an error about malformed git status
          throw new Error('Failed to parse git status output');
        }
      }

      return changes;
    } catch (error: any) {
      // Handle specific git error cases
      if (error.message.includes('bad revision')) {
        const branchName = error.message.includes(baseBranch) ? baseBranch : targetBranch;
        throw new Error(`Branch '${branchName}' does not exist`);
      } else if (error.message.includes('not a git repository')) {
        throw new Error('Git repository not found or not initialized');
      } else if (error.message.includes('does not have any commits')) {
        throw new Error('Repository has no commits');
      } else if (error.message.includes('Failed to parse git status output')) {
        throw error; // Re-throw parsing errors as-is
      }

      throw error; // Re-throw other errors
    }
  }

  /**
   * Check if a file path represents a source code file
   */
  isSourceCodeFile(filePath: string): boolean {
    // Exclude test files
    if (
      filePath.includes('__tests__') ||
      filePath.includes('.test.') ||
      filePath.includes('.spec.')
    ) {
      return false;
    }

    // Exclude node_modules
    if (filePath.includes('node_modules')) {
      return false;
    }

    // Exclude configuration and documentation files
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

    // Include TypeScript and JavaScript files
    return filePath.endsWith('.ts') || filePath.endsWith('.js');
  }

  /**
   * Parse a single line from git status output
   */
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

    // Handle renamed files (R\told\tnew format)
    if (status.startsWith('R') && parts.length >= 3) {
      filePath = parts[2];
    }

    let changeType: 'added' | 'modified' | 'deleted';

    switch (status[0]) {
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
        changeType = 'modified'; // Treat renames as modifications
        break;
      default:
        throw new Error('Invalid git status line format');
    }

    return { changeType, filePath };
  }

  /**
   * Count added and removed lines in a git diff
   */
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
