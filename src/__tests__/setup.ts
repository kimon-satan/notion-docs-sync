/**
 * Vitest setup file
 * This file is run before all tests
 */

import { vi } from 'vitest';

// Setup test environment
process.env['NODE_ENV'] = 'test';
process.env['NOTION_API_KEY'] = 'test-notion-key';
process.env['NOTION_DATABASE_ID'] = 'test-database-id';
process.env['GITHUB_TOKEN'] = 'test-github-token';
process.env['GITHUB_OWNER'] = 'test-owner';
process.env['GITHUB_REPO'] = 'test-repo';

// Mock console methods in tests to avoid noise
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
