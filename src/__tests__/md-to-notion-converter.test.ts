import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tryfabric/martian', () => ({
  markdownToBlocks: vi.fn(),
}));

import { MdToNotionConverter } from '../lib/md-to-notion-converter';
import { markdownToBlocks } from '@tryfabric/martian';

const mockMarkdownToBlocks = vi.mocked(markdownToBlocks);

describe('MdToNotionConverter', () => {
  const converter = new MdToNotionConverter();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should convert markdown to Notion blocks', () => {
    const mockBlocks = [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } }];
    mockMarkdownToBlocks.mockReturnValue(mockBlocks);

    const result = converter.convertToBlocks('# Hello\n\nWorld');

    expect(mockMarkdownToBlocks).toHaveBeenCalledWith('# Hello\n\nWorld');
    expect(result).toEqual(mockBlocks);
  });

  it('should return empty array for empty string', () => {
    const result = converter.convertToBlocks('');

    expect(result).toEqual([]);
    expect(mockMarkdownToBlocks).not.toHaveBeenCalled();
  });

  it('should return empty array for whitespace-only string', () => {
    const result = converter.convertToBlocks('   \n\n  ');

    expect(result).toEqual([]);
    expect(mockMarkdownToBlocks).not.toHaveBeenCalled();
  });
});
