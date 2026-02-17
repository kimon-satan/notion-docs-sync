/* eslint-disable no-console */
import { readdir, readFile, writeFile } from 'fs/promises';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { LocalDocsReader } from './local-docs-reader';

vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

const mockReaddir = vi.mocked(readdir);
const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);

describe('LocalDocsReader', () => {
  let reader: LocalDocsReader;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    reader = new LocalDocsReader('./notionDocs');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('readLocalDocs', () => {
    it('should read markdown files and extract page IDs', async () => {
      mockReaddir.mockResolvedValue(['doc1.md', 'doc2.md', 'readme.txt'] as never);
      mockReadFile
        .mockResolvedValueOnce('pageId=abc123\n\n# Doc 1' as never)
        .mockResolvedValueOnce('pageId=def456\n\n# Doc 2' as never);

      const result = await reader.readLocalDocs();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        filePath: 'notionDocs/doc1.md',
        fileName: 'doc1.md',
        pageId: 'abc123',
      });
      expect(result[1]).toEqual({
        filePath: 'notionDocs/doc2.md',
        fileName: 'doc2.md',
        pageId: 'def456',
      });
    });

    it('should only process .md files', async () => {
      mockReaddir.mockResolvedValue(['doc.md', 'image.png', 'notes.txt', 'data.json'] as never);
      mockReadFile.mockResolvedValue('pageId=abc123\n' as never);

      const result = await reader.readLocalDocs();

      expect(result).toHaveLength(1);
      expect(mockReadFile).toHaveBeenCalledTimes(1);
    });

    it('should skip files without page IDs', async () => {
      mockReaddir.mockResolvedValue(['doc1.md'] as never);
      mockReadFile.mockResolvedValue('# No page ID here\n\nJust content' as never);

      const result = await reader.readLocalDocs();

      expect(result).toHaveLength(0);
    });

    it('should handle individual file read errors gracefully', async () => {
      mockReaddir.mockResolvedValue(['doc1.md'] as never);
      mockReadFile.mockRejectedValue(new Error('read error'));

      const result = await reader.readLocalDocs();

      expect(result).toHaveLength(0);
      expect(console.error).toHaveBeenCalled();
    });

    it('should throw when directory read fails', async () => {
      mockReaddir.mockRejectedValue(new Error('dir not found'));

      await expect(reader.readLocalDocs()).rejects.toThrow('Failed to read local docs');
    });

    it('should extract page IDs from alt format (page_id: xxx)', async () => {
      mockReaddir.mockResolvedValue(['doc1.md'] as never);
      mockReadFile.mockResolvedValue('page_id: abc123\n\n# Doc' as never);

      const result = await reader.readLocalDocs();

      expect(result).toHaveLength(1);
      expect(result[0]?.pageId).toBe('abc123');
    });

    it('should extract page IDs from pageId= format', async () => {
      mockReaddir.mockResolvedValue(['doc1.md'] as never);
      mockReadFile.mockResolvedValue('pageId=abcdef0123456789\n' as never);

      const result = await reader.readLocalDocs();

      expect(result).toHaveLength(1);
      expect(result[0]?.pageId).toBe('abcdef0123456789');
    });
  });

  describe('getPageIds', () => {
    it('should return array of page IDs', async () => {
      mockReaddir.mockResolvedValue(['doc1.md', 'doc2.md'] as never);
      mockReadFile
        .mockResolvedValueOnce('pageId=abc123\n' as never)
        .mockResolvedValueOnce('pageId=def456\n' as never);

      const ids = await reader.getPageIds();

      expect(ids).toEqual(['abc123', 'def456']);
    });

    it('should return empty array when no docs found', async () => {
      mockReaddir.mockResolvedValue([] as never);

      const ids = await reader.getPageIds();

      expect(ids).toEqual([]);
    });
  });

  describe('updateLocalDocs', () => {
    it('should update matching local files with Notion content', async () => {
      mockReaddir.mockResolvedValue(['doc1.md'] as never);
      mockReadFile.mockResolvedValue(
        'pageId=abc123\n\n# Old Title\n\n*Last updated: 2025-01-01*\n\nOld content\n' as never
      );
      mockWriteFile.mockResolvedValue(undefined);

      const notionDocs = [
        {
          id: 'abc123',
          title: 'New Title',
          lastModified: new Date('2026-02-15T00:00:00Z'),
          content: 'New content',
          tags: ['tag1'],
          syncStatus: 'synced' as const,
        },
      ];

      await reader.updateLocalDocs(notionDocs);

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const written = mockWriteFile.mock.calls[0]?.[1] as string;
      expect(written).toContain('pageId=abc123');
      expect(written).toContain('# New Title');
      expect(written).toContain('New content');
      expect(written).toContain('**Tags:** tag1');
    });

    it('should match IDs with dashes against IDs without dashes', async () => {
      mockReaddir.mockResolvedValue(['doc1.md'] as never);
      mockReadFile.mockResolvedValue('pageId=abc123def456\n\n# Title\n' as never);
      mockWriteFile.mockResolvedValue(undefined);

      const notionDocs = [
        {
          id: 'abc123-def456',
          title: 'Title',
          lastModified: new Date(),
          content: 'content',
          tags: [],
          syncStatus: 'synced' as const,
        },
      ];

      await reader.updateLocalDocs(notionDocs);

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
    });

    it('should skip docs with no matching local file', async () => {
      mockReaddir.mockResolvedValue(['doc1.md'] as never);
      mockReadFile.mockResolvedValue('pageId=abc123\n' as never);

      const notionDocs = [
        {
          id: 'nomatch999',
          title: 'No Match',
          lastModified: new Date(),
          content: 'content',
          tags: [],
          syncStatus: 'synced' as const,
        },
      ];

      await reader.updateLocalDocs(notionDocs);

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it('should handle write errors gracefully', async () => {
      mockReaddir.mockResolvedValue(['doc1.md'] as never);
      mockReadFile.mockResolvedValue(
        'pageId=abc123\n\n# Title\n\n*Last updated: 2025-01-01*\n' as never
      );
      mockWriteFile.mockRejectedValue(new Error('write error'));

      const notionDocs = [
        {
          id: 'abc123',
          title: 'Title',
          lastModified: new Date(),
          content: 'content',
          tags: [],
          syncStatus: 'synced' as const,
        },
      ];

      await reader.updateLocalDocs(notionDocs);

      expect(console.error).toHaveBeenCalled();
    });

    it('should include empty content placeholder when doc has no content', async () => {
      mockReaddir.mockResolvedValue(['doc1.md'] as never);
      mockReadFile.mockResolvedValue('pageId=abc123\n\n# Title\n' as never);
      mockWriteFile.mockResolvedValue(undefined);

      const notionDocs = [
        {
          id: 'abc123',
          title: 'Title',
          lastModified: new Date(),
          content: '   ',
          tags: [],
          syncStatus: 'synced' as const,
        },
      ];

      await reader.updateLocalDocs(notionDocs);

      const written = mockWriteFile.mock.calls[0]?.[1] as string;
      expect(written).toContain('*No content available*');
    });
  });

  describe('extractTimestamp', () => {
    it('should extract date from Last updated line', () => {
      const content = '# Title\n\n*Last updated: 2026-02-15T00:00:00.000Z*\n\nContent';
      const result = reader.extractTimestamp(content);

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toContain('2026-02-15');
    });

    it('should return null when no timestamp found', () => {
      const content = '# Title\n\nNo timestamp here';
      const result = reader.extractTimestamp(content);

      expect(result).toBeNull();
    });
  });

  describe('extractBodyContent', () => {
    it('should strip metadata and return body only', () => {
      const content =
        'pageId=abc123\n\n# Title\n\n*Last updated: 2026-02-15*\n\n**Tags:** tag1\n\nBody content here';
      const result = reader.extractBodyContent(content);

      expect(result).toBe('Body content here');
    });

    it('should handle content with no metadata', () => {
      const content = 'Just plain text content';
      const result = reader.extractBodyContent(content);

      expect(result).toBe('Just plain text content');
    });

    it('should strip all metadata lines and trim whitespace', () => {
      const content = 'pageId=abc\n# Heading\n*Last updated: 2026-01-01*\n**Tags:** x\n';
      const result = reader.extractBodyContent(content);

      expect(result).toBe('');
    });
  });

  describe('readFullDoc', () => {
    it('should return complete metadata for a doc file', async () => {
      mockReadFile.mockResolvedValue(
        'pageId=abc123\n\n# My Title\n\n*Last updated: 2026-02-15T00:00:00.000Z*\n\n**Tags:** api, docs\n\nBody text\n' as never
      );

      const result = await reader.readFullDoc({
        filePath: '/docs/test.md',
        fileName: 'test.md',
        pageId: 'abc123',
      });

      expect(result.pageId).toBe('abc123');
      expect(result.title).toBe('My Title');
      expect(result.tags).toEqual(['api', 'docs']);
      expect(result.bodyContent).toBe('Body text');
      expect(result.lastUpdated).toBeInstanceOf(Date);
      expect(result.filePath).toBe('/docs/test.md');
      expect(result.fileName).toBe('test.md');
    });

    it('should handle doc with no tags', async () => {
      mockReadFile.mockResolvedValue(
        'pageId=abc123\n\n# Title\n\n*Last updated: 2026-02-15T00:00:00.000Z*\n\nContent\n' as never
      );

      const result = await reader.readFullDoc({
        filePath: '/docs/test.md',
        fileName: 'test.md',
        pageId: 'abc123',
      });

      expect(result.tags).toEqual([]);
    });

    it('should handle doc with no title', async () => {
      mockReadFile.mockResolvedValue(
        'pageId=abc123\n\n*Last updated: 2026-02-15T00:00:00.000Z*\n\nContent\n' as never
      );

      const result = await reader.readFullDoc({
        filePath: '/docs/test.md',
        fileName: 'test.md',
        pageId: 'abc123',
      });

      expect(result.title).toBe('');
    });
  });

  describe('updateTimestampOnly', () => {
    it('should update only the timestamp in a file', async () => {
      mockReadFile.mockResolvedValue(
        'pageId=abc123\n\n# Title\n\n*Last updated: 2025-01-01T00:00:00.000Z*\n\nBody\n' as never
      );
      mockWriteFile.mockResolvedValue(undefined);

      const newDate = new Date('2026-02-15T12:00:00Z');
      await reader.updateTimestampOnly('/docs/test.md', newDate);

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const written = mockWriteFile.mock.calls[0]?.[1] as string;
      expect(written).not.toContain('2025-01-01');
      expect(written).toContain('2026-02-15');
    });

    it('should leave content unchanged when no timestamp exists', async () => {
      const content = 'pageId=abc123\n\n# Title\n\nBody\n';
      mockReadFile.mockResolvedValue(content as never);
      mockWriteFile.mockResolvedValue(undefined);

      await reader.updateTimestampOnly('/docs/test.md', new Date());

      const written = mockWriteFile.mock.calls[0]?.[1] as string;
      expect(written).toBe(content);
    });
  });
});
