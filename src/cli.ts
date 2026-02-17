#!/usr/bin/env node
/* eslint-disable no-console */
import { Command } from 'commander';

import { fetchCommand } from './commands/fetch';
import { initCommand } from './commands/init';
import { syncCommand } from './commands/sync';
import { stampCommand } from './commands/stamp';

const program = new Command();

program
  .name('notion-doc-sync')
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
  .command('init')
  .description('Create a .notion-doc-sync.json config file')
  .action(() => {
    try {
      initCommand();
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('sync')
  .description('Bidirectional sync between local docs and Notion')
  .option('--dry-run', 'Preview sync actions without making changes')
  .action(async (options: { dryRun?: boolean }) => {
    try {
      await syncCommand(options);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('stamp')
  .description('Update timestamps on locally modified documentation files')
  .action(async () => {
    try {
      await stampCommand();
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
