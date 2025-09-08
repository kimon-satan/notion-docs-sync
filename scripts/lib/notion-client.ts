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
   * Fetch specific Notion pages by their IDs
   */
  async fetchPagesByIds(pageIds: string[]): Promise<NotionDoc[]> {
    console.log(`🔍 Fetching ${pageIds.length} specific Notion pages...`);

    const docs: NotionDoc[] = [];

    for (const pageId of pageIds) {
      try {
        console.log(`  Fetching page: ${pageId}`);

        // Fetch the page
        const page = await this.client.pages.retrieve({
          page_id: pageId,
        });

        if ('properties' in page) {
          const doc = await this.parseNotionPage(page);
          if (doc) {
            docs.push(doc);
            console.log(`    ✅ ${doc.title}`);
          }
        } else {
          console.log(`    ⚠️ Page ${pageId} has no properties (might be archived)`);
        }
      } catch (error: any) {
        console.error(`    ❌ Failed to fetch page ${pageId}:`, error.message);
      }
    }

    console.log(`📄 Successfully fetched ${docs.length} pages`);
    return docs;
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
   * Extract text from a Notion block and convert to markdown
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
      case 'to_do':
        const checked = block.to_do?.checked ? '[x]' : '[ ]';
        return `${checked} ${this.extractRichText(block.to_do?.rich_text)}`;
      case 'quote':
        return `> ${this.extractRichText(block.quote?.rich_text)}`;
      case 'callout':
        const icon = block.callout?.icon?.emoji || '💡';
        return `${icon} ${this.extractRichText(block.callout?.rich_text)}`;
      case 'code':
        const language = block.code?.language || '';
        const codeText = this.extractRichText(block.code?.rich_text);
        return `\`\`\`${language}\n${codeText}\n\`\`\``;
      case 'divider':
        return '---';
      case 'bookmark':
        const bookmarkUrl = block.bookmark?.url;
        return bookmarkUrl ? `[${bookmarkUrl}](${bookmarkUrl})` : '';
      case 'link_preview':
        const linkUrl = block.link_preview?.url;
        return linkUrl ? `[${linkUrl}](${linkUrl})` : '';
      case 'embed':
        const embedUrl = block.embed?.url;
        if (embedUrl) {
          // Detect the type of embed and provide a more descriptive label
          const embedLabel = this.getEmbedLabel(embedUrl);
          return `**${embedLabel}**: [${embedUrl}](${embedUrl})`;
        }
        return '';
      case 'image':
        const imageUrl = block.image?.file?.url || block.image?.external?.url;
        const caption = this.extractRichText(block.image?.caption || []);
        return imageUrl ? `![${caption}](${imageUrl})` : '';
      case 'video':
        const videoUrl = block.video?.file?.url || block.video?.external?.url;
        const videoCaption = this.extractRichText(block.video?.caption || []);
        return videoUrl ? `**Video**: [${videoCaption || 'Watch Video'}](${videoUrl})` : '';
      case 'file':
        const fileUrl = block.file?.file?.url || block.file?.external?.url;
        const fileName = block.file?.name || 'Download File';
        return fileUrl ? `**File**: [${fileName}](${fileUrl})` : '';
      case 'pdf':
        const pdfUrl = block.pdf?.file?.url || block.pdf?.external?.url;
        const pdfCaption = this.extractRichText(block.pdf?.caption || []);
        return pdfUrl ? `**PDF**: [${pdfCaption || 'View PDF'}](${pdfUrl})` : '';
      default:
        // For unknown block types, try to extract rich_text if it exists
        const unknownRichText = block[block.type]?.rich_text;
        return unknownRichText ? this.extractRichText(unknownRichText) : '';
    }
  }

  /**
   * Get a descriptive label for embedded content based on URL
   */
  private getEmbedLabel(url: string): string {
    const domain = this.extractDomain(url);

    switch (domain) {
      case 'miro.com':
        return 'Miro Board';
      case 'figma.com':
        return 'Figma Design';
      case 'youtube.com':
      case 'youtu.be':
        return 'YouTube Video';
      case 'vimeo.com':
        return 'Vimeo Video';
      case 'loom.com':
        return 'Loom Recording';
      case 'spotify.com':
        return 'Spotify';
      case 'soundcloud.com':
        return 'SoundCloud';
      case 'twitter.com':
      case 'x.com':
        return 'Tweet';
      case 'instagram.com':
        return 'Instagram Post';
      case 'linkedin.com':
        return 'LinkedIn Post';
      case 'github.com':
        return 'GitHub';
      case 'codepen.io':
        return 'CodePen';
      case 'jsfiddle.net':
        return 'JSFiddle';
      case 'replit.com':
        return 'Repl.it';
      case 'codesandbox.io':
        return 'CodeSandbox';
      case 'airtable.com':
        return 'Airtable';
      case 'typeform.com':
        return 'Typeform';
      case 'calendly.com':
        return 'Calendly';
      case 'maps.google.com':
      case 'goo.gl/maps':
        return 'Google Maps';
      default:
        return 'Embedded Content';
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  /**
   * Extract markdown-formatted text from rich text array
   */
  private extractRichText(richText: any[]): string {
    if (!richText || !Array.isArray(richText)) {
      return '';
    }

    return richText
      .map((textObj: any) => {
        let text = textObj.plain_text || '';

        // Handle links
        if (textObj.href) {
          let linkUrl = textObj.href;

          // Convert internal Notion links to full URLs
          if (linkUrl.startsWith('/')) {
            // Remove leading slash and any additional path segments
            const pageId = linkUrl.replace(/^\//, '').split('?')[0];
            linkUrl = `https://www.notion.so/${pageId}`;
          }

          text = `[${text}](${linkUrl})`;
        }

        // Handle text formatting
        if (textObj.annotations) {
          const { bold, italic, strikethrough, underline, code } = textObj.annotations;

          if (code) {
            text = `\`${text}\``;
          }

          if (bold) {
            text = `**${text}**`;
          }

          if (italic) {
            text = `*${text}*`;
          }

          if (strikethrough) {
            text = `~~${text}~~`;
          }

          if (underline) {
            // Markdown doesn't have native underline, so we'll use HTML
            text = `<u>${text}</u>`;
          }
        }

        return text;
      })
      .join('');
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
