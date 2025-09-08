import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file
dotenvConfig();

/**
 * Application configuration interface
 */
export interface AppConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly notion: {
    readonly apiKey: string;
    readonly databaseId: string;
  };
  readonly github: {
    readonly token: string;
    readonly owner: string;
    readonly repo: string;
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
 * Application configuration
 */
export const config: AppConfig = {
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: parseInt(getEnvVar('PORT', '3000'), 10),
  notion: {
    apiKey: getEnvVar('NOTION_API_KEY', ''),
    databaseId: getEnvVar('NOTION_DATABASE_ID', ''),
  },
  github: {
    token: getEnvVar('GITHUB_TOKEN', ''),
    owner: getEnvVar('GITHUB_OWNER', ''),
    repo: getEnvVar('GITHUB_REPO', ''),
  },
};
