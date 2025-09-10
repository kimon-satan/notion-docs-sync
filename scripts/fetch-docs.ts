#!/usr/bin/env ts-node
/**
 * Notion Documentation Fetcher Script
 *
 * This script fetches documentation from Notion and updates local
 * markdown files in the notionDocs directory.
 *
 * Usage:
 *   npm run script:fetch-docs
 *   or called directly from git hooks
 */

import { config } from './lib/config';
import { NotionClient } from './lib/notion-client';
import { LocalDocsReader } from './lib/local-docs-reader';

/**
 * Main execution function for the documentation sync script
 */
async function main(): Promise<void> {
  console.log('🔄 Starting documentation synchronization...');

  try {
    // Initialize components
    const notionClient = new NotionClient(config.notion.apiKey);
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

    console.log('✅ Documentation sync completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during documentation sync:', error);
    process.exit(1);
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
