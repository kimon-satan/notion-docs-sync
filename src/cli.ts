#!/usr/bin/env node
/* eslint-disable no-console */
import { config as dotenvConfig } from 'dotenv';
import { Command } from 'commander';
import { fetchCommand } from './commands/fetch';
import { analyzeCommand } from './commands/analyze';
import { initCommand } from './commands/init';

dotenvConfig();

const program = new Command();

program
  .name('notion-doc-fetcher')
  .description('CLI tool to keep Notion documentation aligned with code changes')
  .version('1.0.0');

program
  .command('fetch')
  .description('Fetch documentation from Notion and save locally')
  .option('--api-key <key>', 'Notion API key')
  .option('--database-id <id>', 'Notion database ID')
  .option('--docs-dir <path>', 'Local documentation directory')
  .option('--config <path>', 'Path to config file')
  .action(
    async (options: {
      apiKey?: string;
      databaseId?: string;
      docsDir?: string;
      config?: string;
    }) => {
      try {
        await fetchCommand(options);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    }
  );

program
  .command('analyze')
  .description('Analyze git changes and map to documentation files')
  .option('--base-branch <branch>', 'Base branch for comparison', 'main')
  .option('--target-branch <branch>', 'Target branch for comparison', 'HEAD')
  .option('--source-dir <path>', 'Source code directory')
  .option('--docs-dir <path>', 'Documentation directory')
  .option('--config <path>', 'Path to config file')
  .action(
    async (options: {
      baseBranch?: string;
      targetBranch?: string;
      sourceDir?: string;
      docsDir?: string;
      config?: string;
    }) => {
      try {
        await analyzeCommand(options);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    }
  );

program
  .command('init')
  .description('Create a .notion-doc-fetcher.json config file')
  .action(() => {
    try {
      initCommand();
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
