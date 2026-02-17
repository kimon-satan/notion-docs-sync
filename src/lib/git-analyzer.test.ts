/* eslint-disable @typescript-eslint/await-thenable */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as childProcess from 'child_process';
import { GitAnalyzer } from './git-analyzer';

// Mock child_process for git commands
vi.mock('child_process');
const mockExecSync = vi.mocked(childProcess.execSync);

describe('GitAnalyzer', () => {
  let gitAnalyzer: GitAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    gitAnalyzer = new GitAnalyzer();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getCodeChanges', () => {
    it('should extract changed files between branches', async () => {
      // Mock git status output
      mockExecSync.mockReturnValueOnce(
        Buffer.from('M\tsrc/index.ts\nA\tsrc/new-feature.ts\nD\tsrc/deprecated-utils.ts\n')
      );

      // Mock individual git diff outputs
      mockExecSync
        .mockReturnValueOnce(
          Buffer.from('diff --git a/src/index.ts b/src/index.ts\n+added line\n-removed line')
        )
        .mockReturnValueOnce(
          Buffer.from('diff --git a/src/new-feature.ts b/src/new-feature.ts\n+new file content')
        )
        .mockReturnValueOnce(
          Buffer.from(
            'diff --git a/src/deprecated-utils.ts b/src/deprecated-utils.ts\n-deleted content'
          )
        );

      const changes = await gitAnalyzer.getCodeChanges('main', 'feature-branch');

      expect(changes).toHaveLength(3);
      expect(changes[0]).toMatchObject({
        filePath: 'src/index.ts',
        changeType: 'modified',
        isSourceCode: true,
      });
      expect(changes[1]).toMatchObject({
        filePath: 'src/new-feature.ts',
        changeType: 'added',
        isSourceCode: true,
      });
      expect(changes[2]).toMatchObject({
        filePath: 'src/deprecated-utils.ts',
        changeType: 'deleted',
        isSourceCode: true,
      });
    });

    it('should parse git status output into CodeChange objects', async () => {
      const gitStatusOutput = 'M\tsrc/index.ts\nA\tsrc/utils.ts\nD\tsrc/old.ts\n';
      mockExecSync.mockReturnValueOnce(Buffer.from(gitStatusOutput));

      // Mock diff outputs
      mockExecSync
        .mockReturnValueOnce(Buffer.from('diff content for index.ts'))
        .mockReturnValueOnce(Buffer.from('diff content for utils.ts'))
        .mockReturnValueOnce(Buffer.from('diff content for old.ts'));

      const changes = await gitAnalyzer.getCodeChanges('main', 'develop');

      expect(mockExecSync).toHaveBeenCalledWith(
        'git diff --name-status main..develop',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        { encoding: 'utf8', cwd: expect.any(String) }
      );

      expect(changes).toHaveLength(3);
      expect(changes.map((c) => c.changeType)).toEqual(['modified', 'added', 'deleted']);
    });

    it('should filter for source code files only', async () => {
      const gitStatusOutput =
        [
          'M\tsrc/index.ts',
          'M\tpackage.json',
          'A\tsrc/utils.js',
          'M\tREADME.md',
          'D\ttest/example.test.ts',
          'A\tnode_modules/some-package/index.js',
          'M\t.gitignore',
        ].join('\n') + '\n';

      mockExecSync.mockReturnValueOnce(Buffer.from(gitStatusOutput));

      // Mock diff outputs only for source files
      mockExecSync
        .mockReturnValueOnce(Buffer.from('diff for index.ts'))
        .mockReturnValueOnce(Buffer.from('diff for utils.js'));

      const changes = await gitAnalyzer.getCodeChanges('main', 'feature');

      // Should only include .ts and .js files from src/, excluding tests and node_modules
      expect(changes).toHaveLength(2);
      expect(changes.map((c) => c.filePath)).toEqual(['src/index.ts', 'src/utils.js']);
      expect(changes.every((c) => c.isSourceCode)).toBe(true);
    });

    it('should count lines added and removed per file', async () => {
      mockExecSync.mockReturnValueOnce(Buffer.from('M\tsrc/index.ts\n'));

      // Mock git diff with specific line changes
      const diffOutput = `diff --git a/src/index.ts b/src/index.ts
index 1234567..abcdefg 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,8 @@
 export function test() {
-  console.log('old');
+  console.log('new');
+  console.log('added line 1');
+  console.log('added line 2');
 }`;

      mockExecSync.mockReturnValueOnce(Buffer.from(diffOutput));

      const changes = await gitAnalyzer.getCodeChanges('main', 'feature');

      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        filePath: 'src/index.ts',
        linesAdded: 3, // 3 lines with + prefix
        linesRemoved: 1, // 1 line with - prefix
        diffContent: diffOutput,
      });
    });

    it('should categorize changes as added, modified, or deleted', async () => {
      mockExecSync.mockReturnValueOnce(
        Buffer.from('A\tsrc/new.ts\nM\tsrc/existing.ts\nD\tsrc/removed.ts\n')
      );

      mockExecSync
        .mockReturnValueOnce(Buffer.from('diff for new.ts'))
        .mockReturnValueOnce(Buffer.from('diff for existing.ts'))
        .mockReturnValueOnce(Buffer.from('diff for removed.ts'));

      const changes = await gitAnalyzer.getCodeChanges('main', 'feature');

      expect(changes).toHaveLength(3);
      expect(changes[0].changeType).toBe('added');
      expect(changes[1].changeType).toBe('modified');
      expect(changes[2].changeType).toBe('deleted');
    });

    it('should extract actual diff content for LLM analysis', async () => {
      mockExecSync.mockReturnValueOnce(Buffer.from('M\tsrc/index.ts\n'));

      const expectedDiff = 'diff --git a/src/index.ts b/src/index.ts\n+new functionality';
      mockExecSync.mockReturnValueOnce(Buffer.from(expectedDiff));

      const changes = await gitAnalyzer.getCodeChanges('main', 'feature');

      expect(changes).toHaveLength(1);
      expect(changes[0].diffContent).toBe(expectedDiff);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent branches gracefully', () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error("fatal: bad revision 'non-existent-branch'");
      });

      expect(() => gitAnalyzer.getCodeChanges('main', 'non-existent-branch')).toThrow(
        "Branch 'non-existent-branch' does not exist"
      );
    });

    it('should handle git command failures gracefully', () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('fatal: not a git repository');
      });

      expect(() => gitAnalyzer.getCodeChanges('main', 'feature')).toThrow(
        'Git repository not found or not initialized'
      );
    });

    it('should validate git repository state', () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error("fatal: your current branch 'main' does not have any commits yet");
      });

      expect(() => gitAnalyzer.getCodeChanges('main', 'feature')).toThrow(
        'Repository has no commits'
      );
    });

    it('should handle empty diff output', () => {
      mockExecSync.mockReturnValueOnce(Buffer.from(''));

      const changes = gitAnalyzer.getCodeChanges('main', 'feature');

      expect(changes).toEqual([]);
    });

    it('should handle malformed git status output', () => {
      mockExecSync.mockReturnValueOnce(Buffer.from('invalid-status-line\n'));

      expect(() => gitAnalyzer.getCodeChanges('main', 'feature')).toThrow(
        'Failed to parse git status output'
      );
    });
  });

  describe('isSourceCodeFile', () => {
    it('should correctly identify TypeScript source files', () => {
      expect(gitAnalyzer.isSourceCodeFile('src/index.ts')).toBe(true);
      expect(gitAnalyzer.isSourceCodeFile('lib/utils.ts')).toBe(true);
    });

    it('should correctly identify JavaScript source files', () => {
      expect(gitAnalyzer.isSourceCodeFile('src/index.js')).toBe(true);
      expect(gitAnalyzer.isSourceCodeFile('lib/utils.js')).toBe(true);
    });

    it('should exclude test files', () => {
      expect(gitAnalyzer.isSourceCodeFile('test/index.test.ts')).toBe(false);
      expect(gitAnalyzer.isSourceCodeFile('src/__tests__/utils.test.js')).toBe(false);
      expect(gitAnalyzer.isSourceCodeFile('spec/example.spec.ts')).toBe(false);
    });

    it('should exclude node_modules', () => {
      expect(gitAnalyzer.isSourceCodeFile('node_modules/package/index.ts')).toBe(false);
    });

    it('should exclude configuration files', () => {
      expect(gitAnalyzer.isSourceCodeFile('package.json')).toBe(false);
      expect(gitAnalyzer.isSourceCodeFile('tsconfig.json')).toBe(false);
      expect(gitAnalyzer.isSourceCodeFile('.gitignore')).toBe(false);
      expect(gitAnalyzer.isSourceCodeFile('README.md')).toBe(false);
    });
  });

  describe('parseGitStatusLine', () => {
    it('should parse modified file status', () => {
      const result = gitAnalyzer.parseGitStatusLine('M\tsrc/index.ts');
      expect(result).toEqual({
        changeType: 'modified',
        filePath: 'src/index.ts',
      });
    });

    it('should parse added file status', () => {
      const result = gitAnalyzer.parseGitStatusLine('A\tsrc/new-feature.ts');
      expect(result).toEqual({
        changeType: 'added',
        filePath: 'src/new-feature.ts',
      });
    });

    it('should parse deleted file status', () => {
      const result = gitAnalyzer.parseGitStatusLine('D\tsrc/old-feature.ts');
      expect(result).toEqual({
        changeType: 'deleted',
        filePath: 'src/old-feature.ts',
      });
    });

    it('should handle renamed files', () => {
      const result = gitAnalyzer.parseGitStatusLine('R\tsrc/old.ts\tsrc/new.ts');
      expect(result).toEqual({
        changeType: 'modified',
        filePath: 'src/new.ts',
      });
    });

    it('should throw error for invalid status format', () => {
      expect(() => gitAnalyzer.parseGitStatusLine('invalid-line')).toThrow(
        'Invalid git status line format'
      );
    });
  });

  describe('countDiffLines', () => {
    it('should count added and removed lines correctly', () => {
      const diff = `diff --git a/src/index.ts b/src/index.ts
@@ -1,5 +1,8 @@
 function example() {
-  console.log('old line 1');
-  console.log('old line 2');
+  console.log('new line 1');
+  console.log('new line 2');
+  console.log('added line');
 }`;

      const result = gitAnalyzer.countDiffLines(diff);
      expect(result).toEqual({
        linesAdded: 3,
        linesRemoved: 2,
      });
    });

    it('should handle diff with only additions', () => {
      const diff = `diff --git a/src/new.ts b/src/new.ts
@@ -0,0 +1,5 @@
+export function newFunction() {
+  return 'hello';
+}`;

      const result = gitAnalyzer.countDiffLines(diff);
      expect(result).toEqual({
        linesAdded: 3,
        linesRemoved: 0,
      });
    });

    it('should handle diff with only deletions', () => {
      const diff = `diff --git a/src/removed.ts b/src/removed.ts
@@ -1,3 +0,0 @@
-export function removedFunction() {
-  return 'goodbye';
-}`;

      const result = gitAnalyzer.countDiffLines(diff);
      expect(result).toEqual({
        linesAdded: 0,
        linesRemoved: 3,
      });
    });

    it('should ignore context lines and diff headers', () => {
      const diff = `diff --git a/src/index.ts b/src/index.ts
index 1234567..abcdefg 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -10,6 +10,7 @@
 function example() {
   const x = 1;
+  const y = 2;
   return x;
 }`;

      const result = gitAnalyzer.countDiffLines(diff);
      expect(result).toEqual({
        linesAdded: 1,
        linesRemoved: 0,
      });
    });
  });
});
