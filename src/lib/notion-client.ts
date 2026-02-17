/* eslint-disable no-console */
import { Client, isFullPage } from '@notionhq/client';
import type {
  PageObjectResponse,
  RichTextItemResponse,
  BlockObjectRequest,
} from '@notionhq/client/build/src/api-endpoints';

import { NotionMdConverter } from './notion-md-converter';

export interface NotionDoc {
  readonly id: string;
  readonly title: string;
  readonly lastModified: Date;
  readonly content: string;
  readonly tags: string[];
  readonly linkedCodeFile?: string;
  readonly syncStatus: 'synced' | 'outdated' | 'orphaned';
}

export class NotionClient {
  private readonly client: Client;
  private readonly mdConverter: NotionMdConverter;

  constructor(apiKey: string) {
    this.client = new Client({ auth: apiKey });
    this.mdConverter = new NotionMdConverter(this.client);
  }

  getClient(): Client {
    return this.client;
  }

  async fetchAllDocs(databaseId: string): Promise<NotionDoc[]> {
    try {
      const response = await this.client.databases.query({
        database_id: databaseId,
      });

      const docs: NotionDoc[] = [];

      for (const page of response.results) {
        if (isFullPage(page)) {
          const doc = await this.parseNotionPage(page);
          if (doc) {
            docs.push(doc);
          }
        }
      }

      return docs;
    } catch (error) {
      throw new Error(`Failed to fetch docs from Notion: ${String(error)}`);
    }
  }

  async fetchPagesByIds(pageIds: string[]): Promise<NotionDoc[]> {
    const docs: NotionDoc[] = [];

    for (const pageId of pageIds) {
      try {
        const page = await this.client.pages.retrieve({ page_id: pageId });

        if (isFullPage(page)) {
          const doc = await this.parseNotionPage(page);
          if (doc) {
            docs.push(doc);
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to fetch page ${pageId}: ${message}`);
      }
    }

    return docs;
  }

  async fetchPageLastEdited(pageId: string): Promise<Date> {
    const page = await this.client.pages.retrieve({ page_id: pageId });
    if (!isFullPage(page)) {
      throw new Error(`Page ${pageId} is not a full page`);
    }
    return new Date(page.last_edited_time);
  }

  async replacePageContent(pageId: string, blocks: BlockObjectRequest[]): Promise<void> {
    const existingBlocks = await this.listAllChildBlocks(pageId);

    for (const block of existingBlocks) {
      await this.client.blocks.delete({ block_id: block.id });
    }

    const batchSize = 100;
    for (let i = 0; i < blocks.length; i += batchSize) {
      const batch = blocks.slice(i, i + batchSize);
      await this.client.blocks.children.append({
        block_id: pageId,
        children: batch,
      });
    }
  }

  private async listAllChildBlocks(blockId: string): Promise<Array<{ id: string }>> {
    const allBlocks: Array<{ id: string }> = [];
    let cursor: string | undefined;

    do {
      const response = await this.client.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
      });

      for (const block of response.results) {
        allBlocks.push({ id: block.id });
      }

      if (response.has_more && response.next_cursor !== null) {
        cursor = response.next_cursor;
      } else {
        cursor = undefined;
      }
    } while (cursor !== undefined);

    return allBlocks;
  }

  private async parseNotionPage(page: PageObjectResponse): Promise<NotionDoc | null> {
    try {
      const title = this.extractTitle(page);
      const lastModified = new Date(page.last_edited_time);
      const tags = this.extractTags(page);
      const linkedCodeFile = this.extractLinkedCodeFile(page);
      const content = await this.fetchPageContent(page.id);

      return {
        id: page.id,
        title,
        lastModified,
        content,
        tags,
        linkedCodeFile,
        syncStatus: 'synced',
      };
    } catch (error) {
      console.warn(`Failed to parse page ${page.id}:`, error);
      return null;
    }
  }

  // TODO: Notion property types require complex type narrowing — revisit when SDK improves
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/strict-boolean-expressions */
  private extractTitle(page: PageObjectResponse): string {
    const properties = page.properties as Record<string, any>;
    const titleProperty = properties['Title'] ?? properties['Name'];
    if (
      titleProperty?.title &&
      Array.isArray(titleProperty.title) &&
      titleProperty.title.length > 0
    ) {
      return (titleProperty.title[0] as RichTextItemResponse).plain_text || 'Untitled';
    }
    return 'Untitled';
  }

  private extractTags(page: PageObjectResponse): string[] {
    const properties = page.properties as Record<string, any>;
    const tagsProperty = properties['Tags'];
    if (tagsProperty?.multi_select && Array.isArray(tagsProperty.multi_select)) {
      return tagsProperty.multi_select.map((tag: any) => tag.name as string);
    }
    return [];
  }

  private extractLinkedCodeFile(page: PageObjectResponse): string | undefined {
    const properties = page.properties as Record<string, any>;
    const codeFileProperty = properties['Code File'];
    if (
      codeFileProperty?.rich_text &&
      Array.isArray(codeFileProperty.rich_text) &&
      codeFileProperty.rich_text.length > 0
    ) {
      return (codeFileProperty.rich_text[0] as RichTextItemResponse).plain_text;
    }
    return undefined;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/strict-boolean-expressions */

  private async fetchPageContent(pageId: string): Promise<string> {
    try {
      return await this.mdConverter.pageToMarkdown(pageId);
    } catch (error) {
      console.warn(`Failed to fetch content for page ${pageId}:`, error);
      return '';
    }
  }

  async updateSyncStatus(pageId: string, status: string): Promise<void> {
    try {
      await this.client.pages.update({
        page_id: pageId,
        properties: {
          'Sync Status': {
            select: {
              name: status,
            },
          },
          'Last Sync': {
            date: {
              start: new Date().toISOString(),
            },
          },
        },
      });
    } catch (error) {
      console.warn(`Failed to update sync status for page ${pageId}:`, error);
    }
  }
}
