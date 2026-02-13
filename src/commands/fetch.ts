/* eslint-disable no-console */
import { resolveConfig } from '../lib/config';
import { NotionClient } from '../lib/notion-client';
import { LocalDocsReader } from '../lib/local-docs-reader';

export async function fetchCommand(): Promise<void> {
  console.log('Starting documentation synchronization...');

  const config = resolveConfig();

  const notionClient = new NotionClient(config.notion.apiKey);
  const localDocsReader = new LocalDocsReader(config.analysis.docsDir);

  console.log('Reading local documentation files...');
  const pageIds = await localDocsReader.getPageIds();

  if (pageIds.length === 0) {
    console.log('No local docs found with page IDs. Nothing to fetch.');
    return;
  }

  console.log('Fetching Notion documentation...');
  const docs = await notionClient.fetchPagesByIds(pageIds);
  console.log(`Found ${docs.length} documentation pages`);

  console.log('Updating local documentation files...');
  await localDocsReader.updateLocalDocs(docs);

  console.log('Documentation sync completed successfully');
}
