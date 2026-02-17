/* eslint-disable no-console */
import { writeFileSync, existsSync } from 'fs';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { initCommand } from './init';

vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock('../lib/config', () => ({
  getDefaultConfig: (): {
    notion: { apiKey: string; databaseId: string };
    analysis: { docsDir: string };
  } => ({
    notion: { apiKey: '', databaseId: '' },
    analysis: { docsDir: './notionDocs' },
  }),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

describe('initCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create config file when it does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    initCommand();

    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    const writtenContent = mockWriteFileSync.mock.calls[0]?.[1] as string;
    expect(JSON.parse(writtenContent.trim())).toEqual({
      notion: { apiKey: '', databaseId: '' },
      analysis: { docsDir: './notionDocs' },
    });
  });

  it('should write config as formatted JSON with trailing newline', () => {
    mockExistsSync.mockReturnValue(false);

    initCommand();

    const writtenContent = mockWriteFileSync.mock.calls[0]?.[1] as string;
    expect(writtenContent.endsWith('\n')).toBe(true);
    expect(writtenContent).toContain('  ');
  });

  it('should not overwrite existing config file', () => {
    mockExistsSync.mockReturnValue(true);

    initCommand();

    expect(mockWriteFileSync).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });

  it('should log instructions after creating config', () => {
    mockExistsSync.mockReturnValue(false);

    initCommand();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Created config file'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Notion API key'));
  });
});
