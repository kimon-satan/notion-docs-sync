/* eslint-disable no-console */
import { Client, isFullPage, isFullBlock } from '@notionhq/client';
import type {
  PageObjectResponse,
  BlockObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';

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

  constructor(apiKey: string) {
    this.client = new Client({ auth: apiKey });
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
      const response = await this.client.blocks.children.list({
        block_id: pageId,
      });

      let content = '';

      for (const block of response.results) {
        if (isFullBlock(block)) {
          content += this.extractBlockText(block) + '\n';
        }
      }

      return content.trim();
    } catch (error) {
      console.warn(`Failed to fetch content for page ${pageId}:`, error);
      return '';
    }
  }

  private extractBlockText(block: BlockObjectResponse): string {
    switch (block.type) {
      case 'paragraph':
        return this.extractRichText(block.paragraph.rich_text);
      case 'heading_1':
        return `# ${this.extractRichText(block.heading_1.rich_text)}`;
      case 'heading_2':
        return `## ${this.extractRichText(block.heading_2.rich_text)}`;
      case 'heading_3':
        return `### ${this.extractRichText(block.heading_3.rich_text)}`;
      case 'bulleted_list_item':
        return `- ${this.extractRichText(block.bulleted_list_item.rich_text)}`;
      case 'numbered_list_item':
        return `1. ${this.extractRichText(block.numbered_list_item.rich_text)}`;
      case 'to_do': {
        const checked = block.to_do.checked ? '[x]' : '[ ]';
        return `${checked} ${this.extractRichText(block.to_do.rich_text)}`;
      }
      case 'quote':
        return `> ${this.extractRichText(block.quote.rich_text)}`;
      case 'callout': {
        const icon = block.callout.icon?.type === 'emoji' ? block.callout.icon.emoji : '💡';
        return `${icon} ${this.extractRichText(block.callout.rich_text)}`;
      }
      case 'code': {
        const language = block.code.language ?? '';
        const codeText = this.extractRichText(block.code.rich_text);
        return `\`\`\`${language}\n${codeText}\n\`\`\``;
      }
      case 'divider':
        return '---';
      case 'bookmark': {
        const bookmarkUrl = block.bookmark.url;
        return bookmarkUrl ? `[${bookmarkUrl}](${bookmarkUrl})` : '';
      }
      case 'link_preview': {
        const linkUrl = block.link_preview.url;
        return linkUrl ? `[${linkUrl}](${linkUrl})` : '';
      }
      case 'embed': {
        const embedUrl = block.embed.url;
        if (embedUrl) {
          const embedLabel = this.getEmbedLabel(embedUrl);
          return `**${embedLabel}**: [${embedUrl}](${embedUrl})`;
        }
        return '';
      }
      case 'image': {
        const imageUrl =
          block.image.type === 'file' ? block.image.file.url : block.image.external.url;
        const caption = this.extractRichText(block.image.caption);
        return imageUrl ? `![${caption}](${imageUrl})` : '';
      }
      case 'video': {
        const videoUrl =
          block.video.type === 'file' ? block.video.file.url : block.video.external.url;
        const videoCaption = this.extractRichText(block.video.caption);
        return videoUrl ? `**Video**: [${videoCaption || 'Watch Video'}](${videoUrl})` : '';
      }
      case 'file': {
        const fileUrl = block.file.type === 'file' ? block.file.file.url : block.file.external.url;
        const fileName = block.file.name ?? 'Download File';
        return fileUrl ? `**File**: [${fileName}](${fileUrl})` : '';
      }
      case 'pdf': {
        const pdfUrl = block.pdf.type === 'file' ? block.pdf.file.url : block.pdf.external.url;
        const pdfCaption = this.extractRichText(block.pdf.caption);
        return pdfUrl ? `**PDF**: [${pdfCaption || 'View PDF'}](${pdfUrl})` : '';
      }
      default:
        return '';
    }
  }

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

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  private extractRichText(richText: RichTextItemResponse[]): string {
    if (!Array.isArray(richText)) {
      return '';
    }

    return richText
      .map((textObj) => {
        let text = textObj.plain_text ?? '';

        if (textObj.href !== null) {
          let linkUrl = textObj.href;

          if (linkUrl.startsWith('/')) {
            const pageId = linkUrl.replace(/^\//, '').split('?')[0] ?? '';
            linkUrl = `https://www.notion.so/${pageId}`;
          }

          text = `[${text}](${linkUrl})`;
        }

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
          text = `<u>${text}</u>`;
        }

        return text;
      })
      .join('');
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
