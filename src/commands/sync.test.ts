/* eslint-disable no-console */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetchPagesByIds = vi.fn();
const mockFetchPageLastEdited = vi.fn();
const mockReplacePageContent = vi.fn();
const mockReadLocalDocs = vi.fn();
const mockReadFullDoc = vi.fn();
const mockUpdateLocalDocs = vi.fn();
const mockUpdateTimestampOnly = vi.fn();
const mockConvertToBlocks = vi.fn();

vi.mock('../lib/notion-client', () => ({
  NotionClient: vi.fn(() => ({
    fetchPagesByIds: mockFetchPagesByIds,
    fetchPageLastEdited: mockFetchPageLastEdited,
    replacePageContent: mockReplacePageContent,
  })),
}));

vi.mock('../lib/local-docs-reader', () => ({
  LocalDocsReader: vi.fn(() => ({
    readLocalDocs: mockReadLocalDocs,
    readFullDoc: mockReadFullDoc,
    updateLocalDocs: mockUpdateLocalDocs,
    updateTimestampOnly: mockUpdateTimestampOnly,
  })),
}));

vi.mock('../lib/md-to-notion-converter', () => ({
  MdToNotionConverter: vi.fn(() => ({
    convertToBlocks: mockConvertToBlocks,
  })),
}));

vi.mock('../lib/config', () => ({
  resolveConfig: (): { notion: { apiKey: string }; analysis: { docsDir: string } } => ({
    notion: { apiKey: 'test-key' },
    analysis: { docsDir: './notionDocs' },
  }),
  validateConfig: vi.fn(),
}));

import { syncCommand } from './sync';

describe('syncCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should do nothing when no local docs found', async () => {
    mockReadLocalDocs.mockResolvedValue([]);

    await syncCommand();

    expect(mockFetchPageLastEdited).not.toHaveBeenCalled();
  });

  it('should pull when notion is newer', async () => {
    const localDoc = { filePath: '/docs/test.md', fileName: 'test.md', pageId: 'abc123' };
    mockReadLocalDocs.mockResolvedValue([localDoc]);
    mockReadFullDoc.mockResolvedValue({
      pageId: 'abc123',
      title: 'Test',
      lastUpdated: new Date('2026-01-01T00:00:00.000Z'),
      tags: [],
      bodyContent: 'old content',
      rawContent: 'raw',
      filePath: '/docs/test.md',
      fileName: 'test.md',
    });
    mockFetchPageLastEdited.mockResolvedValue(new Date('2026-02-16T14:00:00.000Z'));
    mockFetchPagesByIds.mockResolvedValue([
      { id: 'abc123', title: 'Test', content: 'new content', lastModified: new Date(), tags: [] },
    ]);
    mockUpdateLocalDocs.mockResolvedValue(undefined);

    await syncCommand();

    expect(mockFetchPagesByIds).toHaveBeenCalledWith(['abc123']);
    expect(mockUpdateLocalDocs).toHaveBeenCalled();
  });

  it('should push when local is newer', async () => {
    const localDoc = { filePath: '/docs/test.md', fileName: 'test.md', pageId: 'abc123' };
    mockReadLocalDocs.mockResolvedValue([localDoc]);
    mockReadFullDoc
      .mockResolvedValueOnce({
        pageId: 'abc123',
        title: 'Test',
        lastUpdated: new Date('2026-02-16T14:00:00.000Z'),
        tags: [],
        bodyContent: 'local content',
        rawContent: 'raw',
        filePath: '/docs/test.md',
        fileName: 'test.md',
      })
      .mockResolvedValueOnce({
        pageId: 'abc123',
        title: 'Test',
        lastUpdated: new Date('2026-02-16T14:00:00.000Z'),
        tags: [],
        bodyContent: 'local content',
        rawContent: 'raw',
        filePath: '/docs/test.md',
        fileName: 'test.md',
      });
    mockFetchPageLastEdited
      .mockResolvedValueOnce(new Date('2026-01-01T00:00:00.000Z'))
      .mockResolvedValueOnce(new Date('2026-02-16T14:00:00.000Z'));
    mockConvertToBlocks.mockReturnValue([{ type: 'paragraph' }]);
    mockReplacePageContent.mockResolvedValue(undefined);
    mockUpdateTimestampOnly.mockResolvedValue(undefined);

    await syncCommand();

    expect(mockConvertToBlocks).toHaveBeenCalledWith('local content');
    expect(mockReplacePageContent).toHaveBeenCalledWith('abc123', [{ type: 'paragraph' }]);
    expect(mockUpdateTimestampOnly).toHaveBeenCalled();
  });

  it('should skip when timestamps are equal', async () => {
    const timestamp = new Date('2026-02-16T14:00:00.000Z');
    const localDoc = { filePath: '/docs/test.md', fileName: 'test.md', pageId: 'abc123' };
    mockReadLocalDocs.mockResolvedValue([localDoc]);
    mockReadFullDoc.mockResolvedValue({
      pageId: 'abc123',
      title: 'Test',
      lastUpdated: timestamp,
      tags: [],
      bodyContent: 'content',
      rawContent: 'raw',
      filePath: '/docs/test.md',
      fileName: 'test.md',
    });
    mockFetchPageLastEdited.mockResolvedValue(timestamp);

    await syncCommand();

    expect(mockFetchPagesByIds).not.toHaveBeenCalled();
    expect(mockReplacePageContent).not.toHaveBeenCalled();
  });

  it('should not execute actions in dry-run mode', async () => {
    const localDoc = { filePath: '/docs/test.md', fileName: 'test.md', pageId: 'abc123' };
    mockReadLocalDocs.mockResolvedValue([localDoc]);
    mockReadFullDoc.mockResolvedValue({
      pageId: 'abc123',
      title: 'Test',
      lastUpdated: new Date('2026-01-01T00:00:00.000Z'),
      tags: [],
      bodyContent: 'content',
      rawContent: 'raw',
      filePath: '/docs/test.md',
      fileName: 'test.md',
    });
    mockFetchPageLastEdited.mockResolvedValue(new Date('2026-02-16T14:00:00.000Z'));

    await syncCommand({ dryRun: true });

    expect(mockFetchPagesByIds).not.toHaveBeenCalled();
    expect(mockReplacePageContent).not.toHaveBeenCalled();
    expect(mockUpdateLocalDocs).not.toHaveBeenCalled();
  });

  it('should handle errors for individual docs gracefully', async () => {
    const doc1 = { filePath: '/docs/good.md', fileName: 'good.md', pageId: 'good123' };
    const doc2 = { filePath: '/docs/bad.md', fileName: 'bad.md', pageId: 'bad456' };
    mockReadLocalDocs.mockResolvedValue([doc1, doc2]);

    mockReadFullDoc
      .mockResolvedValueOnce({
        pageId: 'good123',
        title: 'Good',
        lastUpdated: new Date('2026-02-16T14:00:00.000Z'),
        tags: [],
        bodyContent: 'content',
        rawContent: 'raw',
        filePath: '/docs/good.md',
        fileName: 'good.md',
      })
      .mockRejectedValueOnce(new Error('file read error'));

    mockFetchPageLastEdited.mockResolvedValue(new Date('2026-02-16T14:00:00.000Z'));

    await syncCommand();

    expect(console.error).toHaveBeenCalled();
  });
});
