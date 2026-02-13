#!/usr/bin/env node
/* eslint-disable no-console */
import { Command } from 'commander';
import { fetchCommand } from './commands/fetch';
import { analyzeCommand } from './commands/analyze';
import { initCommand } from './commands/init';

const program = new Command();

program
  .name('notion-doc-fetcher')
  .description('CLI tool to keep Notion documentation aligned with code changes')
  .version('1.0.0');

program
  .command('fetch')
  .description('Fetch documentation from Notion and save locally')
  .action(async () => {
    try {
      await fetchCommand();
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze git changes and map to documentation files')
  .option('--base-branch <branch>', 'Base branch for comparison', 'main')
  .option('--target-branch <branch>', 'Target branch for comparison', 'HEAD')
  .action(async (options: { baseBranch?: string; targetBranch?: string }) => {
    try {
      await analyzeCommand(options);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

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
