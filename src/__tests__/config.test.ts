import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveConfig, validateConfig, getDefaultConfig } from '../lib/config';
import * as fs from 'fs';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);

describe('config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('resolveConfig', () => {
    it('should return defaults when no config sources are available', () => {
      delete process.env['NOTION_API_KEY'];
      delete process.env['NOTION_DATABASE_ID'];
      delete process.env['SOURCE_DIR'];
      delete process.env['DOCS_DIR'];

      const config = resolveConfig();

      expect(config.notion.apiKey).toBe('');
      expect(config.notion.databaseId).toBe('');
      expect(config.analysis.sourceDir).toBe('./src');
      expect(config.analysis.docsDir).toBe('./notionDocs');
    });

    it('should use environment variables when set', () => {
      process.env['NOTION_API_KEY'] = 'env-api-key';
      process.env['NOTION_DATABASE_ID'] = 'env-db-id';
      process.env['SOURCE_DIR'] = './custom-src';
      process.env['DOCS_DIR'] = './custom-docs';

      const config = resolveConfig();

      expect(config.notion.apiKey).toBe('env-api-key');
      expect(config.notion.databaseId).toBe('env-db-id');
      expect(config.analysis.sourceDir).toBe('./custom-src');
      expect(config.analysis.docsDir).toBe('./custom-docs');
    });

    it('should prioritize CLI options over environment variables', () => {
      process.env['NOTION_API_KEY'] = 'env-key';
      process.env['SOURCE_DIR'] = './env-src';

      const config = resolveConfig({
        apiKey: 'cli-key',
        sourceDir: './cli-src',
      });

      expect(config.notion.apiKey).toBe('cli-key');
      expect(config.analysis.sourceDir).toBe('./cli-src');
    });

    it('should load values from config file', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          notionApiKey: 'file-key',
          notionDatabaseId: 'file-db-id',
          sourceDir: './file-src',
        })
      );

      delete process.env['NOTION_API_KEY'];
      delete process.env['NOTION_DATABASE_ID'];
      delete process.env['SOURCE_DIR'];

      const config = resolveConfig();

      expect(config.notion.apiKey).toBe('file-key');
      expect(config.notion.databaseId).toBe('file-db-id');
      expect(config.analysis.sourceDir).toBe('./file-src');
    });

    it('should prioritize env vars over config file values', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          notionApiKey: 'file-key',
        })
      );

      process.env['NOTION_API_KEY'] = 'env-key';

      const config = resolveConfig();

      expect(config.notion.apiKey).toBe('env-key');
    });

    it('should prioritize CLI options over both env and file', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          notionApiKey: 'file-key',
        })
      );

      process.env['NOTION_API_KEY'] = 'env-key';

      const config = resolveConfig({ apiKey: 'cli-key' });

      expect(config.notion.apiKey).toBe('cli-key');
    });

    it('should throw on malformed config file', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('not valid json {{{');

      expect(() => resolveConfig()).toThrow('Failed to parse config file');
    });

    it('should use custom config path when provided', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ notionApiKey: 'custom-key' }));

      delete process.env['NOTION_API_KEY'];

      resolveConfig({ config: '/custom/path/config.json' });

      expect(mockExistsSync).toHaveBeenCalledWith('/custom/path/config.json');
    });
  });

  describe('validateConfig', () => {
    it('should pass when required fields are present', () => {
      const config = resolveConfig({ apiKey: 'key', databaseId: 'db' });

      expect(() => validateConfig(config, ['notionApiKey', 'notionDatabaseId'])).not.toThrow();
    });

    it('should throw when notionApiKey is missing', () => {
      delete process.env['NOTION_API_KEY'];

      const config = resolveConfig();

      expect(() => validateConfig(config, ['notionApiKey'])).toThrow('Notion API key is required');
    });

    it('should throw when notionDatabaseId is missing', () => {
      delete process.env['NOTION_DATABASE_ID'];

      const config = resolveConfig();

      expect(() => validateConfig(config, ['notionDatabaseId'])).toThrow(
        'Notion database ID is required'
      );
    });

    it('should report multiple missing fields', () => {
      delete process.env['NOTION_API_KEY'];
      delete process.env['NOTION_DATABASE_ID'];

      const config = resolveConfig();

      expect(() => validateConfig(config, ['notionApiKey', 'notionDatabaseId'])).toThrow(
        'Configuration errors'
      );
    });
  });

  describe('getDefaultConfig', () => {
    it('should return expected default values', () => {
      const defaults = getDefaultConfig();

      expect(defaults.notionApiKey).toBe('');
      expect(defaults.notionDatabaseId).toBe('');
      expect(defaults.sourceDir).toBe('./src');
      expect(defaults.docsDir).toBe('./notionDocs');
      expect(defaults.excludePatterns).toContain('node_modules/**');
    });
  });
});
