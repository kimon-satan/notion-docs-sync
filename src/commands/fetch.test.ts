/* eslint-disable no-console */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { fetchCommand } from './fetch';

const mockFetchPagesByIds = vi.fn();
const mockGetPageIds = vi.fn();
const mockUpdateLocalDocs = vi.fn();

vi.mock('../lib/notion-client', () => ({
  NotionClient: vi.fn(() => ({
    fetchPagesByIds: mockFetchPagesByIds,
  })),
}));

vi.mock('../lib/local-docs-reader', () => ({
  LocalDocsReader: vi.fn(() => ({
    getPageIds: mockGetPageIds,
    updateLocalDocs: mockUpdateLocalDocs,
  })),
}));

vi.mock('../lib/config', () => ({
  resolveConfig: (): { notion: { apiKey: string }; analysis: { docsDir: string } } => ({
    notion: { apiKey: 'test-key' },
    analysis: { docsDir: './notionDocs' },
  }),
}));

describe('fetchCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should do nothing when no page IDs found', async () => {
    mockGetPageIds.mockResolvedValue([]);

    await fetchCommand();

    expect(mockFetchPagesByIds).not.toHaveBeenCalled();
    expect(mockUpdateLocalDocs).not.toHaveBeenCalled();
  });

  it('should log early exit message when no docs found', async () => {
    mockGetPageIds.mockResolvedValue([]);

    await fetchCommand();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No local docs found'));
  });

  it('should fetch and update docs when page IDs exist', async () => {
    mockGetPageIds.mockResolvedValue(['abc123', 'def456']);
    mockFetchPagesByIds.mockResolvedValue([
      {
        id: 'abc123',
        title: 'Doc 1',
        content: 'content 1',
        lastModified: new Date(),
        tags: [],
        syncStatus: 'synced',
      },
      {
        id: 'def456',
        title: 'Doc 2',
        content: 'content 2',
        lastModified: new Date(),
        tags: [],
        syncStatus: 'synced',
      },
    ]);
    mockUpdateLocalDocs.mockResolvedValue(undefined);

    await fetchCommand();

    expect(mockFetchPagesByIds).toHaveBeenCalledWith(['abc123', 'def456']);
    expect(mockUpdateLocalDocs).toHaveBeenCalledTimes(1);
  });

  it('should log completion message on success', async () => {
    mockGetPageIds.mockResolvedValue(['abc123']);
    mockFetchPagesByIds.mockResolvedValue([
      {
        id: 'abc123',
        title: 'Doc',
        content: 'content',
        lastModified: new Date(),
        tags: [],
        syncStatus: 'synced',
      },
    ]);
    mockUpdateLocalDocs.mockResolvedValue(undefined);

    await fetchCommand();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('sync completed'));
  });
});
