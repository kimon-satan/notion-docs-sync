/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { NotionClient } from './notion-client';

const mockDatabasesQuery = vi.fn();
const mockPagesRetrieve = vi.fn();
const mockPagesUpdate = vi.fn();
const mockBlocksChildrenList = vi.fn();
const mockBlocksChildrenAppend = vi.fn();
const mockBlocksDelete = vi.fn();
const mockPageToMarkdown = vi.fn();

vi.mock('@notionhq/client', () => ({
  Client: vi.fn(() => ({
    databases: { query: mockDatabasesQuery },
    pages: { retrieve: mockPagesRetrieve, update: mockPagesUpdate },
    blocks: {
      children: { list: mockBlocksChildrenList, append: mockBlocksChildrenAppend },
      delete: mockBlocksDelete,
    },
  })),
  isFullPage: vi.fn((page: any) => page?.object === 'page'),
}));

vi.mock('./notion-md-converter', () => ({
  NotionMdConverter: vi.fn(() => ({
    pageToMarkdown: mockPageToMarkdown,
  })),
}));

function createMockPage(
  id: string,
  title: string,
  lastEdited: string,
  options?: { tags?: string[]; codeFile?: string }
): Record<string, any> {
  const properties: Record<string, any> = {
    Title: {
      title: [{ plain_text: title }],
    },
    Tags: {
      multi_select: (options?.tags ?? []).map((name) => ({ name })),
    },
  };

  if (options?.codeFile !== undefined) {
    properties['Code File'] = {
      rich_text: [{ plain_text: options.codeFile }],
    };
  }

  return {
    id,
    object: 'page',
    last_edited_time: lastEdited,
    properties,
  };
}

describe('NotionClient', () => {
  let client: NotionClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    client = new NotionClient('test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getClient', () => {
    it('should return the Notion client instance', () => {
      expect(client.getClient()).toBeDefined();
    });
  });

  describe('fetchAllDocs', () => {
    it('should fetch and parse pages from a database', async () => {
      const mockPage = createMockPage('page-1', 'Test Doc', '2026-02-15T00:00:00Z');
      mockDatabasesQuery.mockResolvedValue({ results: [mockPage] });
      mockPageToMarkdown.mockResolvedValue('# Content');

      const docs = await client.fetchAllDocs('db-id');

      expect(docs).toHaveLength(1);
      expect(docs[0]?.title).toBe('Test Doc');
      expect(docs[0]?.content).toBe('# Content');
      expect(docs[0]?.syncStatus).toBe('synced');
    });

    it('should extract tags from page properties', async () => {
      const mockPage = createMockPage('page-1', 'Doc', '2026-02-15T00:00:00Z', {
        tags: ['api', 'guide'],
      });
      mockDatabasesQuery.mockResolvedValue({ results: [mockPage] });
      mockPageToMarkdown.mockResolvedValue('content');

      const docs = await client.fetchAllDocs('db-id');

      expect(docs[0]?.tags).toEqual(['api', 'guide']);
    });

    it('should extract linked code file from page properties', async () => {
      const mockPage = createMockPage('page-1', 'Doc', '2026-02-15T00:00:00Z', {
        codeFile: 'src/lib/config.ts',
      });
      mockDatabasesQuery.mockResolvedValue({ results: [mockPage] });
      mockPageToMarkdown.mockResolvedValue('content');

      const docs = await client.fetchAllDocs('db-id');

      expect(docs[0]?.linkedCodeFile).toBe('src/lib/config.ts');
    });

    it('should throw on API failure', async () => {
      mockDatabasesQuery.mockRejectedValue(new Error('API error'));

      await expect(client.fetchAllDocs('db-id')).rejects.toThrow(
        'Failed to fetch docs from Notion'
      );
    });

    it('should skip non-full pages', async () => {
      mockDatabasesQuery.mockResolvedValue({
        results: [{ id: 'partial', object: 'partial_page' }],
      });

      const docs = await client.fetchAllDocs('db-id');

      expect(docs).toHaveLength(0);
    });

    it('should return empty content when page content fetch fails', async () => {
      const mockPage = createMockPage('page-1', 'Doc', '2026-02-15T00:00:00Z');
      mockDatabasesQuery.mockResolvedValue({ results: [mockPage] });
      mockPageToMarkdown.mockRejectedValue(new Error('parse error'));

      const docs = await client.fetchAllDocs('db-id');

      expect(docs).toHaveLength(1);
      expect(docs[0]?.content).toBe('');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should skip pages that fail to parse entirely', async () => {
      const badPage = {
        id: 'page-1',
        object: 'page',
        last_edited_time: '2026-02-15T00:00:00Z',
        properties: null,
      };
      mockDatabasesQuery.mockResolvedValue({ results: [badPage] });

      const docs = await client.fetchAllDocs('db-id');

      expect(docs).toHaveLength(0);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('fetchPagesByIds', () => {
    it('should fetch pages individually by ID', async () => {
      const mockPage = createMockPage('page-1', 'Doc', '2026-02-15T00:00:00Z');
      mockPagesRetrieve.mockResolvedValue(mockPage);
      mockPageToMarkdown.mockResolvedValue('content');

      const docs = await client.fetchPagesByIds(['page-1']);

      expect(docs).toHaveLength(1);
      expect(mockPagesRetrieve).toHaveBeenCalledWith({ page_id: 'page-1' });
    });

    it('should handle individual page fetch errors gracefully', async () => {
      mockPagesRetrieve
        .mockRejectedValueOnce(new Error('not found'))
        .mockResolvedValueOnce(createMockPage('page-2', 'Doc 2', '2026-02-15T00:00:00Z'));
      mockPageToMarkdown.mockResolvedValue('content');

      const docs = await client.fetchPagesByIds(['page-1', 'page-2']);

      expect(docs).toHaveLength(1);
      expect(docs[0]?.id).toBe('page-2');
      expect(console.error).toHaveBeenCalled();
    });

    it('should return empty array when all fetches fail', async () => {
      mockPagesRetrieve.mockRejectedValue(new Error('not found'));

      const docs = await client.fetchPagesByIds(['page-1', 'page-2']);

      expect(docs).toHaveLength(0);
    });
  });

  describe('fetchPageLastEdited', () => {
    it('should return last edited time', async () => {
      mockPagesRetrieve.mockResolvedValue(createMockPage('page-1', 'Doc', '2026-02-15T12:00:00Z'));

      const result = await client.fetchPageLastEdited('page-1');

      expect(result).toEqual(new Date('2026-02-15T12:00:00Z'));
    });

    it('should throw for non-full pages', async () => {
      mockPagesRetrieve.mockResolvedValue({ id: 'page-1', object: 'partial' });

      await expect(client.fetchPageLastEdited('page-1')).rejects.toThrow('not a full page');
    });
  });

  describe('replacePageContent', () => {
    it('should delete existing blocks and append new ones', async () => {
      mockBlocksChildrenList.mockResolvedValue({
        results: [{ id: 'block-1' }, { id: 'block-2' }],
        has_more: false,
        next_cursor: null,
      });
      mockBlocksDelete.mockResolvedValue({});
      mockBlocksChildrenAppend.mockResolvedValue({});

      const newBlocks = [{ type: 'paragraph' }] as any;
      await client.replacePageContent('page-1', newBlocks);

      expect(mockBlocksDelete).toHaveBeenCalledTimes(2);
      expect(mockBlocksDelete).toHaveBeenCalledWith({ block_id: 'block-1' });
      expect(mockBlocksDelete).toHaveBeenCalledWith({ block_id: 'block-2' });
      expect(mockBlocksChildrenAppend).toHaveBeenCalledWith({
        block_id: 'page-1',
        children: newBlocks,
      });
    });

    it('should handle paginated block listing', async () => {
      mockBlocksChildrenList
        .mockResolvedValueOnce({
          results: [{ id: 'block-1' }],
          has_more: true,
          next_cursor: 'cursor-1',
        })
        .mockResolvedValueOnce({
          results: [{ id: 'block-2' }],
          has_more: false,
          next_cursor: null,
        });
      mockBlocksDelete.mockResolvedValue({});
      mockBlocksChildrenAppend.mockResolvedValue({});

      await client.replacePageContent('page-1', []);

      expect(mockBlocksChildrenList).toHaveBeenCalledTimes(2);
      expect(mockBlocksDelete).toHaveBeenCalledTimes(2);
    });

    it('should handle empty page (no existing blocks)', async () => {
      mockBlocksChildrenList.mockResolvedValue({
        results: [],
        has_more: false,
        next_cursor: null,
      });
      mockBlocksChildrenAppend.mockResolvedValue({});

      const newBlocks = [{ type: 'paragraph' }] as any;
      await client.replacePageContent('page-1', newBlocks);

      expect(mockBlocksDelete).not.toHaveBeenCalled();
      expect(mockBlocksChildrenAppend).toHaveBeenCalledTimes(1);
    });

    it('should batch blocks in groups of 100', async () => {
      mockBlocksChildrenList.mockResolvedValue({
        results: [],
        has_more: false,
        next_cursor: null,
      });
      mockBlocksChildrenAppend.mockResolvedValue({});

      const blocks = Array.from({ length: 150 }, (_, i) => ({ type: 'paragraph', id: i }));
      await client.replacePageContent('page-1', blocks as any);

      expect(mockBlocksChildrenAppend).toHaveBeenCalledTimes(2);
      expect(mockBlocksChildrenAppend.mock.calls[0]?.[0].children).toHaveLength(100);
      expect(mockBlocksChildrenAppend.mock.calls[1]?.[0].children).toHaveLength(50);
    });
  });

  describe('updateSyncStatus', () => {
    it('should update page properties with sync status', async () => {
      mockPagesUpdate.mockResolvedValue({});

      await client.updateSyncStatus('page-1', 'synced');

      expect(mockPagesUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          page_id: 'page-1',
          properties: expect.objectContaining({
            'Sync Status': { select: { name: 'synced' } },
          }),
        })
      );
    });

    it('should include Last Sync date in update', async () => {
      mockPagesUpdate.mockResolvedValue({});

      await client.updateSyncStatus('page-1', 'outdated');

      const call = mockPagesUpdate.mock.calls[0]?.[0];
      expect(call.properties['Last Sync']).toBeDefined();
      expect(call.properties['Last Sync'].date.start).toBeDefined();
    });

    it('should handle update errors gracefully', async () => {
      mockPagesUpdate.mockRejectedValue(new Error('update failed'));

      await client.updateSyncStatus('page-1', 'synced');

      expect(console.warn).toHaveBeenCalled();
    });
  });
});
