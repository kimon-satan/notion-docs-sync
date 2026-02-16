import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';

export class NotionMdConverter {
  private readonly n2m: NotionToMarkdown;

  constructor(notionClient: Client) {
    this.n2m = new NotionToMarkdown({ notionClient });
  }

  async pageToMarkdown(pageId: string): Promise<string> {
    const mdBlocks = await this.n2m.pageToMarkdown(pageId);
    const mdString = this.n2m.toMarkdownString(mdBlocks);
    return mdString.parent;
  }
}
