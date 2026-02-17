import { readFile, writeFile } from 'fs/promises';
import { execSync } from 'child_process';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { stampCommand } from './stamp';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('../lib/config', () => ({
  resolveConfig: (): { analysis: { docsDir: string } } => ({
    analysis: { docsDir: './notionDocs' },
  }),
}));

const mockExecSync = vi.mocked(execSync);
const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);

describe('stampCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should do nothing when no modified files', async () => {
    mockExecSync.mockReturnValue('');

    await stampCommand();

    expect(mockReadFile).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('should stamp modified markdown files with new timestamp', async () => {
    mockExecSync.mockReturnValue(' M notionDocs/test-page.md\n');
    mockReadFile.mockResolvedValue(
      'pageId=abc123\n\n# Title\n\n*Last updated: 2025-09-08*\n\nBody\n'
    );
    mockWriteFile.mockResolvedValue(undefined);

    const before = new Date();
    await stampCommand();
    const after = new Date();

    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    const writtenContent = mockWriteFile.mock.calls[0]?.[1] as string;

    expect(writtenContent).toContain('*Last updated:');
    expect(writtenContent).not.toContain('2025-09-08');

    const stampMatch = writtenContent.match(/\*Last updated:\s*(.+?)\*/);
    expect(stampMatch).not.toBeNull();
    const stampedDate = new Date(stampMatch![1]);
    expect(stampedDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(stampedDate.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should skip files without a timestamp line', async () => {
    mockExecSync.mockReturnValue(' M notionDocs/no-timestamp.md\n');
    mockReadFile.mockResolvedValue('# No timestamp here\n\nJust content\n');

    await stampCommand();

    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('should filter to only .md files', async () => {
    mockExecSync.mockReturnValue(
      ' M notionDocs/test.md\n M notionDocs/image.png\n M notionDocs/notes.txt\n'
    );
    mockReadFile.mockResolvedValue('pageId=abc\n\n# T\n\n*Last updated: 2025-01-01*\n\nBody\n');
    mockWriteFile.mockResolvedValue(undefined);

    await stampCommand();

    expect(mockReadFile).toHaveBeenCalledTimes(1);
  });

  it('should handle git status failure gracefully', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repo');
    });

    await stampCommand();

    expect(mockReadFile).not.toHaveBeenCalled();
  });
});
