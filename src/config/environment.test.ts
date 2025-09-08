import { describe, it, expect } from 'vitest';
import { config } from '@/config/environment';

describe('Environment Config', () => {
  it('should load configuration with test values', () => {
    expect(config.nodeEnv).toBe('test');
    expect(config.notion.apiKey).toBe('test-notion-key');
    expect(config.github.token).toBe('test-github-token');
  });

  it('should have a valid port number', () => {
    expect(typeof config.port).toBe('number');
    expect(config.port).toBeGreaterThan(0);
  });

  it('should have all required configuration properties', () => {
    expect(config).toHaveProperty('nodeEnv');
    expect(config).toHaveProperty('port');
    expect(config).toHaveProperty('notion');
    expect(config).toHaveProperty('github');

    expect(config.notion).toHaveProperty('apiKey');
    expect(config.notion).toHaveProperty('databaseId');

    expect(config.github).toHaveProperty('token');
    expect(config.github).toHaveProperty('owner');
    expect(config.github).toHaveProperty('repo');
  });
});
