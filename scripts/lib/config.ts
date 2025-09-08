import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file
dotenvConfig();

/**
 * Script configuration interface - focused on script needs
 */
export interface ScriptConfig {
  readonly nodeEnv: string;
  readonly notion: {
    readonly apiKey: string;
    readonly databaseId: string;
  };
  readonly github: {
    readonly token: string;
    readonly owner: string;
    readonly repo: string;
  };
  readonly analysis: {
    readonly sourceDir: string;
    readonly docsDir: string;
    readonly excludePatterns: string[];
  };
}

/**
 * Get configuration value with fallback
 */
function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

/**
 * Script configuration
 */
export const config: ScriptConfig = {
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  notion: {
    apiKey: getEnvVar('NOTION_API_KEY', ''),
    databaseId: getEnvVar('NOTION_DATABASE_ID', ''),
  },
  github: {
    token: getEnvVar('GITHUB_TOKEN', ''),
    owner: getEnvVar('GITHUB_OWNER', ''),
    repo: getEnvVar('GITHUB_REPO', ''),
  },
  analysis: {
    sourceDir: getEnvVar('SOURCE_DIR', './src'),
    docsDir: getEnvVar('DOCS_DIR', './notionDocs'),
    excludePatterns: [
      'node_modules/**',
      'dist/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/__tests__/**',
      '.git/**',
    ],
  },
};
