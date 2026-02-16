import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';

export function stripAwsCredentials(markdown: string): string {
  return markdown.replace(
    /(?<before>\]\()(?<url>https?:\/\/[^)]+)/gi,
    (_match: string, before: string, url: string) => {
      if (!/X-Amz-/i.test(url)) {
        return `${before}${url}`;
      }
      try {
        const parsed = new URL(url);
        parsed.search = '';
        return `${before}${parsed.toString()}`;
      } catch {
        return `${before}${url}`;
      }
    }
  );
}

export class NotionMdConverter {
  private readonly n2m: NotionToMarkdown;

  constructor(notionClient: Client) {
    this.n2m = new NotionToMarkdown({ notionClient });
  }

  async pageToMarkdown(pageId: string): Promise<string> {
    const mdBlocks = await this.n2m.pageToMarkdown(pageId);
    const mdString = this.n2m.toMarkdownString(mdBlocks);
    return stripAwsCredentials(mdString.parent);
  }
}
