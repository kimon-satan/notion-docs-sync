/* eslint-disable no-console */
import { readFile } from 'fs/promises';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { analyzeCommand } from './analyze';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

const mockGetCodeChanges = vi.fn();
const mockReadLocalDocs = vi.fn();
const mockEnhanceDocumentationFiles = vi.fn();

vi.mock('../lib/git-analyzer', () => ({
  GitAnalyzer: vi.fn(() => ({
    getCodeChanges: mockGetCodeChanges,
  })),
}));

vi.mock('../lib/local-docs-reader', () => ({
  LocalDocsReader: vi.fn(() => ({
    readLocalDocs: mockReadLocalDocs,
  })),
}));

vi.mock('../lib/doc-mapper', () => ({
  DocMapper: vi.fn(() => ({
    enhanceDocumentationFiles: mockEnhanceDocumentationFiles,
  })),
}));

vi.mock('../lib/config', () => ({
  resolveConfig: (): { analysis: { docsDir: string } } => ({
    analysis: { docsDir: './notionDocs' },
  }),
}));

const mockReadFile = vi.mocked(readFile);

describe('analyzeCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should report no changes when no code changes detected', async () => {
    mockGetCodeChanges.mockReturnValue([]);

    await analyzeCommand({});

    expect(mockReadLocalDocs).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No code changes detected'));
  });

  it('should use default branches when not specified', async () => {
    mockGetCodeChanges.mockReturnValue([]);

    await analyzeCommand({});

    expect(mockGetCodeChanges).toHaveBeenCalledWith('main', 'HEAD');
  });

  it('should use custom branches when specified', async () => {
    mockGetCodeChanges.mockReturnValue([]);

    await analyzeCommand({ baseBranch: 'develop', targetBranch: 'feature/x' });

    expect(mockGetCodeChanges).toHaveBeenCalledWith('develop', 'feature/x');
  });

  it('should report no affected docs when no mapping found', async () => {
    mockGetCodeChanges.mockReturnValue([{ filePath: 'src/foo.ts' }]);
    mockReadLocalDocs.mockResolvedValue([
      { filePath: '/docs/test.md', fileName: 'test.md', pageId: 'abc' },
    ]);
    mockReadFile.mockResolvedValue('doc content' as never);
    mockEnhanceDocumentationFiles.mockReturnValue([
      {
        filePath: '/docs/test.md',
        content: 'doc content',
        linkedCodeFiles: [],
        mappingConfidence: 0,
      },
    ]);

    await analyzeCommand({});

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('No documentation files are linked')
    );
  });

  it('should display affected docs when mappings found', async () => {
    mockGetCodeChanges.mockReturnValue([{ filePath: 'src/foo.ts' }]);
    mockReadLocalDocs.mockResolvedValue([
      { filePath: '/docs/test.md', fileName: 'test.md', pageId: 'abc' },
    ]);
    mockReadFile.mockResolvedValue('doc content' as never);
    mockEnhanceDocumentationFiles.mockReturnValue([
      {
        filePath: '/docs/test.md',
        content: 'doc content',
        linkedCodeFiles: ['src/foo.ts'],
        mappingConfidence: 0.85,
      },
    ]);

    await analyzeCommand({});

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('potentially affected'));
  });

  it('should log change count for detected changes', async () => {
    mockGetCodeChanges.mockReturnValue([{ filePath: 'src/a.ts' }, { filePath: 'src/b.ts' }]);
    mockReadLocalDocs.mockResolvedValue([]);
    mockEnhanceDocumentationFiles.mockReturnValue([]);

    await analyzeCommand({});

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2 changed code file'));
  });

  it('should read content for each local doc', async () => {
    mockGetCodeChanges.mockReturnValue([{ filePath: 'src/foo.ts' }]);
    mockReadLocalDocs.mockResolvedValue([
      { filePath: '/docs/a.md', fileName: 'a.md', pageId: 'id1' },
      { filePath: '/docs/b.md', fileName: 'b.md', pageId: 'id2' },
    ]);
    mockReadFile.mockResolvedValue('content' as never);
    mockEnhanceDocumentationFiles.mockReturnValue([]);

    await analyzeCommand({});

    expect(mockReadFile).toHaveBeenCalledTimes(2);
    expect(mockReadFile).toHaveBeenCalledWith('/docs/a.md', 'utf-8');
    expect(mockReadFile).toHaveBeenCalledWith('/docs/b.md', 'utf-8');
  });
});
