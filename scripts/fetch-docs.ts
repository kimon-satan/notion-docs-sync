#!/usr/bin/env ts-node
/**
 * Notion Documentation Fetcher Script
 *
 * This script fetches documentation from Notion and compares it with
 * the current codebase to identify synchronization needs.
 *
 * Usage:
 *   npm run script:fetch-docs
 *   or called directly from git hooks
 */

import { config } from './lib/config';
import { NotionClient } from './lib/notion-client';
import { CodeAnalyzer } from './lib/code-analyzer';
import { DocSyncChecker } from './lib/doc-sync-checker';
import { LocalDocsReader } from './lib/local-docs-reader';

interface SyncResult {
  readonly status: 'success' | 'warning' | 'error';
  readonly message: string;
  readonly details?: string[];
}

/**
 * Main execution function for the documentation sync script
 */
async function main(): Promise<void> {
  console.log('🔄 Starting documentation synchronization check...');

  try {
    // Initialize components
    const notionClient = new NotionClient(config.notion.apiKey);
    const codeAnalyzer = new CodeAnalyzer(config.analysis.sourceDir);
    const syncChecker = new DocSyncChecker(notionClient, codeAnalyzer);
    const localDocsReader = new LocalDocsReader(config.analysis.docsDir);

    // Read local docs to get page IDs to fetch
    console.log('📂 Reading local documentation files...');
    const pageIds = await localDocsReader.getPageIds();

    if (pageIds.length === 0) {
      console.log('⚠️  No local docs found with page IDs. Exiting.');
      process.exit(0);
    }

    // Fetch specific documentation pages from Notion
    console.log('📖 Fetching Notion documentation...');
    const docs = await notionClient.fetchPagesByIds(pageIds);
    console.log(`Found ${docs.length} documentation pages`);

    // Update local documentation files with fresh content
    console.log('💾 Updating local documentation files...');
    await localDocsReader.updateLocalDocs(docs);

    // Analyze current codebase
    console.log('🔍 Analyzing codebase...');
    const codeStructure = await codeAnalyzer.analyzeCodebase();
    console.log(
      `Analyzed ${codeStructure.functions.length} functions and ${codeStructure.classes.length} classes`
    );

    // Check synchronization status
    console.log('🔗 Checking synchronization status...');
    const syncResults = await syncChecker.checkSync(docs, codeStructure);

    // Process results
    const result = await processSyncResults(syncResults);

    console.log(`\n${getStatusEmoji(result.status)} ${result.message}`);

    if (result.details && result.details.length > 0) {
      console.log('\nDetails:');
      result.details.forEach((detail) => console.log(`  • ${detail}`));
    }

    // Exit with appropriate code
    if (result.status === 'error') {
      process.exit(1);
    } else if (result.status === 'warning') {
      console.log('\n⚠️  Warnings detected but allowing commit to proceed');
      process.exit(0);
    } else {
      console.log('\n✅ Documentation is in sync!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error during documentation sync check:', error);
    process.exit(1);
  }
}

/**
 * Process sync results and determine overall status
 */
async function processSyncResults(syncResults: any[]): Promise<SyncResult> {
  const errors = syncResults.filter((r) => r.type === 'error');
  const warnings = syncResults.filter((r) => r.type === 'warning');
  const info = syncResults.filter((r) => r.type === 'info');

  if (errors.length > 0) {
    return {
      status: 'error',
      message: `Documentation sync failed with ${errors.length} error(s)`,
      details: errors.map((e) => e.message),
    };
  }

  if (warnings.length > 0) {
    return {
      status: 'warning',
      message: `Documentation has ${warnings.length} warning(s)`,
      details: warnings.map((w) => w.message),
    };
  }

  return {
    status: 'success',
    message: 'Documentation is synchronized with codebase',
    details: info.map((i) => i.message),
  };
}

/**
 * Get appropriate emoji for status
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    default:
      return 'ℹ️';
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
