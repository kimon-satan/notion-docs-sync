import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('notion-to-md', () => {
  const mockPageToMarkdown = vi.fn();
  const mockToMarkdownString = vi.fn();

  return {
    NotionToMarkdown: vi.fn().mockImplementation(() => ({
      pageToMarkdown: mockPageToMarkdown,
      toMarkdownString: mockToMarkdownString,
    })),
    __mockPageToMarkdown: mockPageToMarkdown,
    __mockToMarkdownString: mockToMarkdownString,
  };
});

import { NotionMdConverter } from '../lib/notion-md-converter';
import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

describe('NotionMdConverter', () => {
  let converter: NotionMdConverter;
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {} as Client;
    converter = new NotionMdConverter(mockClient);
  });

  it('should create NotionToMarkdown with the provided client', () => {
    expect(NotionToMarkdown).toHaveBeenCalledWith({ notionClient: mockClient });
  });

  it('should convert a page to markdown string', async () => {
    const mockBlocks = [{ type: 'paragraph', parent: 'Hello world' }];
    const mocked = vi.mocked(NotionToMarkdown) as any;
    const instance = mocked.mock.results[0].value;
    instance.pageToMarkdown.mockResolvedValue(mockBlocks);
    instance.toMarkdownString.mockReturnValue({ parent: '# Hello\n\nWorld' });

    const result = await converter.pageToMarkdown('page-123');

    expect(instance.pageToMarkdown).toHaveBeenCalledWith('page-123');
    expect(instance.toMarkdownString).toHaveBeenCalledWith(mockBlocks);
    expect(result).toBe('# Hello\n\nWorld');
  });

  it('should return empty string for empty page', async () => {
    const mocked = vi.mocked(NotionToMarkdown) as any;
    const instance = mocked.mock.results[0].value;
    instance.pageToMarkdown.mockResolvedValue([]);
    instance.toMarkdownString.mockReturnValue({ parent: '' });

    const result = await converter.pageToMarkdown('empty-page');

    expect(result).toBe('');
  });
});

/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
