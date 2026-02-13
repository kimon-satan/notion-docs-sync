import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';

describe('CLI', () => {
  const cliPath = resolve(__dirname, '../cli.ts');

  function runCli(args: string): string {
    try {
      return execSync(`npx ts-node ${cliPath} ${args}`, {
        encoding: 'utf-8',
        cwd: resolve(__dirname, '../..'),
        env: { ...process.env, NODE_ENV: 'test' },
        timeout: 15000,
      });
    } catch (error: unknown) {
      if (error !== null && error !== undefined && typeof error === 'object' && 'stdout' in error) {
        return (error as { stdout: string }).stdout;
      }
      throw error;
    }
  }

  describe('--help', () => {
    it('should display help information', () => {
      const output = runCli('--help');

      expect(output).toContain('notion-doc-fetcher');
      expect(output).toContain('fetch');
      expect(output).toContain('analyze');
      expect(output).toContain('init');
    });
  });

  describe('--version', () => {
    it('should display the version number', () => {
      const output = runCli('--version');

      expect(output.trim()).toBe('1.0.0');
    });
  });

  describe('fetch --help', () => {
    it('should display fetch command help', () => {
      const output = runCli('fetch --help');

      expect(output).toContain('--api-key');
      expect(output).toContain('--database-id');
      expect(output).toContain('--docs-dir');
    });
  });

  describe('analyze --help', () => {
    it('should display analyze command help', () => {
      const output = runCli('analyze --help');

      expect(output).toContain('--base-branch');
      expect(output).toContain('--target-branch');
      expect(output).toContain('--source-dir');
      expect(output).toContain('--docs-dir');
    });
  });

  describe('init --help', () => {
    it('should display init command help', () => {
      const output = runCli('init --help');

      expect(output).toContain('config file');
    });
  });
});
