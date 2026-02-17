/* eslint-disable no-console */
import { resolveConfig, validateConfig } from '@/src/lib/config';
import { NotionClient } from '@/src/lib/notion-client';
import { MdToNotionConverter } from '@/src/lib/md-to-notion-converter';
import { LocalDocsReader } from '@/src/lib/local-docs-reader';
import { compareSyncTimestamps } from '@/src/lib/timestamp-utils';
import type { SyncAction, SyncResult } from '@/src/types/doc-sync';

interface SyncOptions {
  readonly dryRun?: boolean;
}

export async function syncCommand(options: SyncOptions = {}): Promise<void> {
  const config = resolveConfig();
  validateConfig(config, ['notionApiKey']);

  const notionClient = new NotionClient(config.notion.apiKey);
  const mdToNotion = new MdToNotionConverter();
  const localDocsReader = new LocalDocsReader(config.analysis.docsDir);

  console.log('Reading local documentation files...');
  const localDocs = await localDocsReader.readLocalDocs();

  if (localDocs.length === 0) {
    console.log('No local docs found with page IDs. Nothing to sync.');
    return;
  }

  console.log('Determining sync actions...');
  const actions: SyncAction[] = [];

  for (const localDoc of localDocs) {
    try {
      const metadata = await localDocsReader.readFullDoc(localDoc);
      const notionTimestamp = await notionClient.fetchPageLastEdited(localDoc.pageId);
      const direction = compareSyncTimestamps(metadata.lastUpdated, notionTimestamp);

      actions.push({
        pageId: localDoc.pageId,
        filePath: localDoc.filePath,
        fileName: localDoc.fileName,
        direction,
        localTimestamp: metadata.lastUpdated,
        notionTimestamp,
      });
    } catch (error) {
      console.error(`  Failed to check ${localDoc.fileName}:`, error);
    }
  }

  printActionSummary(actions);

  if (options.dryRun === true) {
    console.log('\n--dry-run: No changes made.');
    return;
  }

  const results = await executeActions(actions, notionClient, mdToNotion, localDocsReader);
  printResults(results);
}

async function executeActions(
  actions: SyncAction[],
  notionClient: NotionClient,
  mdToNotion: MdToNotionConverter,
  localDocsReader: LocalDocsReader
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const action of actions) {
    if (action.direction === 'none') {
      results.push({
        pageId: action.pageId,
        fileName: action.fileName,
        direction: 'none',
        success: true,
      });
      continue;
    }

    try {
      if (action.direction === 'pull') {
        const docs = await notionClient.fetchPagesByIds([action.pageId]);
        if (docs.length > 0) {
          await localDocsReader.updateLocalDocs(docs);
        }

        results.push({
          pageId: action.pageId,
          fileName: action.fileName,
          direction: 'pull',
          success: true,
          synchronizedTimestamp: action.notionTimestamp,
        });
      } else {
        const metadata = await localDocsReader.readFullDoc({
          filePath: action.filePath,
          fileName: action.fileName,
          pageId: action.pageId,
        });

        const blocks = mdToNotion.convertToBlocks(metadata.bodyContent);
        await notionClient.replacePageContent(action.pageId, blocks);

        const newNotionTimestamp = await notionClient.fetchPageLastEdited(action.pageId);
        await localDocsReader.updateTimestampOnly(action.filePath, newNotionTimestamp);

        results.push({
          pageId: action.pageId,
          fileName: action.fileName,
          direction: 'push',
          success: true,
          synchronizedTimestamp: newNotionTimestamp,
        });
      }
    } catch (error) {
      results.push({
        pageId: action.pageId,
        fileName: action.fileName,
        direction: action.direction,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

function printActionSummary(actions: SyncAction[]): void {
  const pulls = actions.filter((a) => a.direction === 'pull');
  const pushes = actions.filter((a) => a.direction === 'push');
  const skips = actions.filter((a) => a.direction === 'none');

  console.log(`\nSync plan: ${pulls.length} pull, ${pushes.length} push, ${skips.length} skip`);

  for (const action of actions) {
    const arrow = action.direction === 'pull' ? '<--' : action.direction === 'push' ? '-->' : '===';
    console.log(`  ${arrow} ${action.fileName} (${action.direction})`);
  }
}

function printResults(results: SyncResult[]): void {
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);

  console.log(`\nSync complete: ${successes.length} succeeded, ${failures.length} failed`);

  for (const failure of failures) {
    console.error(`  FAILED ${failure.fileName}: ${failure.error ?? 'unknown error'}`);
  }
}
