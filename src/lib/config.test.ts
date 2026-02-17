import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveConfig, validateConfig, getDefaultConfig } from './config';
import * as fs from 'fs';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReadFileSync = vi.mocked(fs.readFileSync);

describe('config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  describe('resolveConfig', () => {
    it('should return defaults when no config file exists', () => {
      const config = resolveConfig();

      expect(config.notion.apiKey).toBe('');
      expect(config.notion.databaseId).toBe('');
      expect(config.analysis.sourceDir).toBe('./src');
      expect(config.analysis.docsDir).toBe('./notionDocs');
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

      const config = resolveConfig();

      expect(config.notion.apiKey).toBe('file-key');
      expect(config.notion.databaseId).toBe('file-db-id');
      expect(config.analysis.sourceDir).toBe('./file-src');
    });

    it('should load exclude patterns from config file', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          excludePatterns: ['custom/**'],
        })
      );

      const config = resolveConfig();

      expect(config.analysis.excludePatterns).toEqual(['custom/**']);
    });

    it('should use default exclude patterns when not in config file', () => {
      const config = resolveConfig();

      expect(config.analysis.excludePatterns).toContain('node_modules/**');
      expect(config.analysis.excludePatterns).toContain('dist/**');
    });

    it('should not use environment variables for config values', () => {
      const originalKey = process.env['NOTION_API_KEY'];
      process.env['NOTION_API_KEY'] = 'env-key-should-be-ignored';

      const config = resolveConfig();

      expect(config.notion.apiKey).toBe('');

      if (originalKey !== undefined) {
        process.env['NOTION_API_KEY'] = originalKey;
      } else {
        delete process.env['NOTION_API_KEY'];
      }
    });

    it('should read NODE_ENV from environment', () => {
      const originalNodeEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'production';

      const config = resolveConfig();

      expect(config.nodeEnv).toBe('production');

      if (originalNodeEnv !== undefined) {
        process.env['NODE_ENV'] = originalNodeEnv;
      } else {
        delete process.env['NODE_ENV'];
      }
    });

    it('should throw on malformed config file', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('not valid json {{{');

      expect(() => resolveConfig()).toThrow('Failed to parse config file');
    });
  });

  describe('validateConfig', () => {
    it('should pass when required fields are present', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ notionApiKey: 'key', notionDatabaseId: 'db' })
      );

      const config = resolveConfig();

      expect(() => validateConfig(config, ['notionApiKey', 'notionDatabaseId'])).not.toThrow();
    });

    it('should throw when notionApiKey is missing', () => {
      const config = resolveConfig();

      expect(() => validateConfig(config, ['notionApiKey'])).toThrow('Notion API key is required');
    });

    it('should throw when notionDatabaseId is missing', () => {
      const config = resolveConfig();

      expect(() => validateConfig(config, ['notionDatabaseId'])).toThrow(
        'Notion database ID is required'
      );
    });

    it('should report multiple missing fields', () => {
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
