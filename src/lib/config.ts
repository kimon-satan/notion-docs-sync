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

function loadConfigFile(): FileConfig {
  const filePath = join(process.cwd(), CONFIG_FILENAME);

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

export function resolveConfig(): AppConfig {
  const fileConfig = loadConfigFile();

  return {
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    notion: {
      apiKey: fileConfig.notionApiKey ?? '',
      databaseId: fileConfig.notionDatabaseId ?? '',
    },
    github: {
      token: fileConfig.githubToken ?? '',
      owner: fileConfig.githubOwner ?? '',
      repo: fileConfig.githubRepo ?? '',
    },
    analysis: {
      sourceDir: fileConfig.sourceDir ?? './src',
      docsDir: fileConfig.docsDir ?? './notionDocs',
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
            'Notion API key is required. Set in .notion-doc-fetcher.json. Run `notion-doc-fetcher init` to create one.'
          );
        }
        break;
      case 'notionDatabaseId':
        if (config.notion.databaseId === '') {
          errors.push(
            'Notion database ID is required. Set in .notion-doc-fetcher.json. Run `notion-doc-fetcher init` to create one.'
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
