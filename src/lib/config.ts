import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIG_FILENAME = '.notion-doc-fetcher.json';

export interface AppConfig {
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

interface FileConfig {
  readonly notionApiKey?: string;
  readonly notionDatabaseId?: string;
  readonly githubToken?: string;
  readonly githubOwner?: string;
  readonly githubRepo?: string;
  readonly sourceDir?: string;
  readonly docsDir?: string;
  readonly excludePatterns?: string[];
}

export interface CliOptions {
  readonly apiKey?: string;
  readonly databaseId?: string;
  readonly sourceDir?: string;
  readonly docsDir?: string;
  readonly config?: string;
  readonly baseBranch?: string;
  readonly targetBranch?: string;
}

function loadConfigFile(configPath?: string): FileConfig {
  const filePath = configPath ?? join(process.cwd(), CONFIG_FILENAME);

  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as FileConfig;
  } catch {
    throw new Error(`Failed to parse config file: ${filePath}`);
  }
}

function getEnvVar(key: string, fallback: string): string {
  const value = process.env[key];
  if (value !== undefined && value !== '') {
    return value;
  }
  return fallback;
}

export function resolveConfig(cliOptions?: CliOptions): AppConfig {
  const fileConfig = loadConfigFile(cliOptions?.config);

  return {
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
    notion: {
      apiKey: cliOptions?.apiKey ?? getEnvVar('NOTION_API_KEY', fileConfig.notionApiKey ?? ''),
      databaseId:
        cliOptions?.databaseId ??
        getEnvVar('NOTION_DATABASE_ID', fileConfig.notionDatabaseId ?? ''),
    },
    github: {
      token: getEnvVar('GITHUB_TOKEN', fileConfig.githubToken ?? ''),
      owner: getEnvVar('GITHUB_OWNER', fileConfig.githubOwner ?? ''),
      repo: getEnvVar('GITHUB_REPO', fileConfig.githubRepo ?? ''),
    },
    analysis: {
      sourceDir: cliOptions?.sourceDir ?? getEnvVar('SOURCE_DIR', fileConfig.sourceDir ?? './src'),
      docsDir: cliOptions?.docsDir ?? getEnvVar('DOCS_DIR', fileConfig.docsDir ?? './notionDocs'),
      excludePatterns: fileConfig.excludePatterns ?? [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/__tests__/**',
        '.git/**',
      ],
    },
  };
}

export function validateConfig(config: AppConfig, requiredFields: string[]): void {
  const errors: string[] = [];

  for (const field of requiredFields) {
    switch (field) {
      case 'notionApiKey':
        if (config.notion.apiKey === '') {
          errors.push(
            'Notion API key is required. Set via --api-key, NOTION_API_KEY env var, or config file.'
          );
        }
        break;
      case 'notionDatabaseId':
        if (config.notion.databaseId === '') {
          errors.push(
            'Notion database ID is required. Set via --database-id, NOTION_DATABASE_ID env var, or config file.'
          );
        }
        break;
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n  - ${errors.join('\n  - ')}`);
  }
}

export function getDefaultConfig(): FileConfig {
  return {
    notionApiKey: '',
    notionDatabaseId: '',
    sourceDir: './src',
    docsDir: './notionDocs',
    excludePatterns: [
      'node_modules/**',
      'dist/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/__tests__/**',
      '.git/**',
    ],
  };
}
