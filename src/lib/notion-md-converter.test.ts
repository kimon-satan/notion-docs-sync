import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';

import { NotionMdConverter, stripAwsCredentials } from './notion-md-converter';

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

  it('should strip AWS credentials from S3 URLs in markdown', async () => {
    const s3Url =
      'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/cat.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=FAKEKEY';
    const mocked = vi.mocked(NotionToMarkdown) as any;
    const instance = mocked.mock.results[0].value;
    instance.pageToMarkdown.mockResolvedValue([]);
    instance.toMarkdownString.mockReturnValue({
      parent: `![cat.jpg](${s3Url})`,
    });

    const result = await converter.pageToMarkdown('page-s3');

    expect(result).toBe(
      '![cat.jpg](https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/cat.jpg)'
    );
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

describe('stripAwsCredentials', () => {
  it('should strip X-Amz-* params from S3 presigned image URLs', () => {
    const input =
      '![cat.jpg](https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/cat.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=FAKEKEY%2F20260216&X-Amz-Security-Token=TOKEN123)';
    const expected = '![cat.jpg](https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/cat.jpg)';

    expect(stripAwsCredentials(input)).toBe(expected);
  });

  it('should preserve non-S3 URLs unchanged', () => {
    const giphy = '![gif](https://media4.giphy.com/media/v1.Y2lk/giphy.gif)';
    const miro = '[embed](https://miro.com/app/live-embed/uXjVJKj4x5w=/?embedMode=view_only)';

    expect(stripAwsCredentials(giphy)).toBe(giphy);
    expect(stripAwsCredentials(miro)).toBe(miro);
  });

  it('should handle markdown with mixed URL types', () => {
    const input = [
      '![gif](https://media4.giphy.com/media/giphy.gif)',
      '![cat.jpg](https://s3.amazonaws.com/bucket/cat.jpg?X-Amz-Algorithm=AWS4&X-Amz-Credential=KEY)',
      '[embed](https://miro.com/app/live-embed/abc/?embedMode=view)',
    ].join('\n');

    const result = stripAwsCredentials(input);

    expect(result).toContain('https://media4.giphy.com/media/giphy.gif');
    expect(result).toContain('https://s3.amazonaws.com/bucket/cat.jpg)');
    expect(result).not.toContain('X-Amz-');
    expect(result).toContain('https://miro.com/app/live-embed/abc/?embedMode=view');
  });

  it('should handle markdown with no URLs', () => {
    const input = '# Hello\n\nJust some text with **bold** and *italic*.';

    expect(stripAwsCredentials(input)).toBe(input);
  });
});
