import { Client } from '@notionhq/client';

/**
 * Interface for a Notion documentation page
 */
export interface NotionDoc {
  readonly id: string;
  readonly title: string;
  readonly lastModified: Date;
  readonly content: string;
  readonly tags: string[];
  readonly linkedCodeFile?: string;
  readonly syncStatus: 'synced' | 'outdated' | 'orphaned';
}

/**
 * Client for interacting with Notion API
 */
export class NotionClient {
  private readonly client: Client;

  constructor(apiKey: string) {
    this.client = new Client({
      auth: apiKey,
    });
  }

  /**
   * Fetch all documentation pages from a Notion database
   */
  async fetchAllDocs(databaseId: string): Promise<NotionDoc[]> {
    try {
      console.log('🔍 Querying Notion database...');

      const response = await this.client.databases.query({
        database_id: databaseId,
      });

      const docs: NotionDoc[] = [];

      for (const page of response.results) {
        if ('properties' in page) {
          const doc = await this.parseNotionPage(page);
          if (doc) {
            docs.push(doc);
          }
        }
      }

      return docs;
    } catch (error) {
      console.error('Error fetching Notion docs:', error);
      throw new Error(`Failed to fetch docs from Notion: ${error}`);
    }
  }

  /**
   * Parse a Notion page into our internal format
   */
  private async parseNotionPage(page: any): Promise<NotionDoc | null> {
    try {
      const title = this.extractTitle(page);
      const lastModified = new Date(page.last_edited_time);
      const tags = this.extractTags(page);
      const linkedCodeFile = this.extractLinkedCodeFile(page);

      // Fetch page content
      const content = await this.fetchPageContent(page.id);

      return {
        id: page.id,
        title,
        lastModified,
        content,
        tags,
        linkedCodeFile,
        syncStatus: 'synced', // Will be updated by sync checker
      };
    } catch (error) {
      console.warn(`Failed to parse page ${page.id}:`, error);
      return null;
    }
  }

  /**
   * Extract title from page properties
   */
  private extractTitle(page: any): string {
    const titleProperty = page.properties?.Title || page.properties?.Name;
    if (titleProperty?.title && titleProperty.title.length > 0) {
      return titleProperty.title[0].plain_text || 'Untitled';
    }
    return 'Untitled';
  }

  /**
   * Extract tags from page properties
   */
  private extractTags(page: any): string[] {
    const tagsProperty = page.properties?.Tags;
    if (tagsProperty?.multi_select) {
      return tagsProperty.multi_select.map((tag: any) => tag.name);
    }
    return [];
  }

  /**
   * Extract linked code file from page properties
   */
  private extractLinkedCodeFile(page: any): string | undefined {
    const codeFileProperty = page.properties?.['Code File'];
    if (codeFileProperty?.rich_text && codeFileProperty.rich_text.length > 0) {
      return codeFileProperty.rich_text[0].plain_text;
    }
    return undefined;
  }

  /**
   * Fetch the content of a page
   */
  private async fetchPageContent(pageId: string): Promise<string> {
    try {
      const response = await this.client.blocks.children.list({
        block_id: pageId,
      });

      let content = '';

      for (const block of response.results) {
        if ('type' in block) {
          content += this.extractBlockText(block) + '\n';
        }
      }

      return content.trim();
    } catch (error) {
      console.warn(`Failed to fetch content for page ${pageId}:`, error);
      return '';
    }
  }

  /**
   * Extract text from a Notion block
   */
  private extractBlockText(block: any): string {
    switch (block.type) {
      case 'paragraph':
        return this.extractRichText(block.paragraph?.rich_text);
      case 'heading_1':
        return `# ${this.extractRichText(block.heading_1?.rich_text)}`;
      case 'heading_2':
        return `## ${this.extractRichText(block.heading_2?.rich_text)}`;
      case 'heading_3':
        return `### ${this.extractRichText(block.heading_3?.rich_text)}`;
      case 'bulleted_list_item':
        return `- ${this.extractRichText(block.bulleted_list_item?.rich_text)}`;
      case 'numbered_list_item':
        return `1. ${this.extractRichText(block.numbered_list_item?.rich_text)}`;
      case 'code':
        return `\`\`\`${block.code?.language || ''}\n${this.extractRichText(block.code?.rich_text)}\n\`\`\``;
      default:
        return '';
    }
  }

  /**
   * Extract plain text from rich text array
   */
  private extractRichText(richText: any[]): string {
    if (!richText || !Array.isArray(richText)) {
      return '';
    }

    return richText.map((text: any) => text.plain_text || '').join('');
  }

  /**
   * Update a page's sync status in Notion
   */
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
