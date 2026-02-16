import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { NotionDoc } from './notion-client';
import type { LocalDocMetadata } from '../types/doc-sync';
import { parseTimestamp, formatTimestamp, replaceTimestampInContent } from './timestamp-utils';

export interface LocalDocFile {
  readonly filePath: string;
  readonly fileName: string;
  readonly pageId: string;
}

/* eslint-disable no-console */

export class LocalDocsReader {
  private readonly docsPath: string;

  constructor(docsPath: string) {
    this.docsPath = docsPath;
  }

  async readLocalDocs(): Promise<LocalDocFile[]> {
    try {
      console.log(`Reading local docs from: ${this.docsPath}`);

      const files = await readdir(this.docsPath);
      const markdownFiles = files.filter((file) => extname(file) === '.md');
      console.log(`  Found ${markdownFiles.length} markdown files`);

      const localDocs: LocalDocFile[] = [];

      for (const fileName of markdownFiles) {
        const filePath = join(this.docsPath, fileName);

        try {
          const content = await readFile(filePath, 'utf-8');
          const pageId = this.extractPageId(content);

          if (pageId !== null) {
            localDocs.push({ filePath, fileName, pageId });
          }
        } catch (error) {
          console.error(`Error reading ${fileName}:`, error);
        }
      }

      console.log(`Found ${localDocs.length} files with page IDs`);
      return localDocs;
    } catch (error) {
      throw new Error(`Failed to read local docs: ${String(error)}`);
    }
  }

  private extractPageId(content: string): string | null {
    const pageIdMatch = content.match(/pageId=([a-f0-9]+)/i);

    if (pageIdMatch?.[1] !== undefined) {
      return pageIdMatch[1];
    }

    const altMatch = content.match(/page[_-]?id[:\s]*([a-f0-9]+)/i);

    if (altMatch?.[1] !== undefined) {
      return altMatch[1];
    }

    return null;
  }

  async getPageIds(): Promise<string[]> {
    const localDocs = await this.readLocalDocs();
    return localDocs.map((doc) => doc.pageId);
  }

  async updateLocalDocs(notionDocs: NotionDoc[]): Promise<void> {
    console.log(`Updating ${notionDocs.length} local documentation files...`);

    const localDocs = await this.readLocalDocs();

    for (const notionDoc of notionDocs) {
      const normalizedNotionId = notionDoc.id.replace(/-/g, '');
      const localDoc = localDocs.find((doc) => doc.pageId.replace(/-/g, '') === normalizedNotionId);

      if (localDoc === undefined) {
        console.log(`No local file found for page ${notionDoc.id}`);
        continue;
      }

      try {
        const currentContent = await readFile(localDoc.filePath, 'utf-8');
        const pageIdLine = this.extractPageIdLine(currentContent);
        const newContent = this.buildUpdatedContent(pageIdLine, notionDoc);
        await writeFile(localDoc.filePath, newContent, 'utf-8');
        console.log(`Updated ${localDoc.fileName}`);
      } catch (error) {
        console.error(`Failed to update ${localDoc.fileName}:`, error);
      }
    }

    console.log('Finished updating local documentation files');
  }

  private extractPageIdLine(content: string): string {
    const lines = content.split('\n');
    const pageIdLine = lines.find((line) => /pageId=/i.test(line));

    if (pageIdLine !== undefined) {
      return pageIdLine.trim();
    }

    const pageId = this.extractPageId(content);
    return pageId !== null ? `pageId=${pageId}` : '';
  }

  private buildUpdatedContent(pageIdLine: string, notionDoc: NotionDoc): string {
    const lines: string[] = [];

    if (pageIdLine !== '') {
      lines.push(pageIdLine);
      lines.push('');
    }

    if (notionDoc.title.trim() !== '') {
      lines.push(`# ${notionDoc.title}`);
      lines.push('');
    }

    lines.push(`*Last updated: ${formatTimestamp(notionDoc.lastModified)}*`);
    lines.push('');

    if (notionDoc.tags.length > 0) {
      lines.push(`**Tags:** ${notionDoc.tags.join(', ')}`);
      lines.push('');
    }

    if (notionDoc.content.trim() !== '') {
      lines.push(notionDoc.content.trim());
    } else {
      lines.push('*No content available*');
    }

    return lines.join('\n') + '\n';
  }

  extractTimestamp(content: string): Date | null {
    return parseTimestamp(content);
  }

  extractBodyContent(content: string): string {
    const lines = content.split('\n');
    const filtered = lines.filter((line) => {
      if (/pageId=/i.test(line)) return false;
      if (/^#\s/.test(line)) return false;
      if (/^[*_]Last updated:/.test(line)) return false;
      if (/^\*\*Tags:\*\*/.test(line)) return false;
      return true;
    });

    return filtered.join('\n').replace(/^\n+/, '').replace(/\n+$/, '').trim();
  }

  async readFullDoc(localDoc: LocalDocFile): Promise<LocalDocMetadata> {
    const rawContent = await readFile(localDoc.filePath, 'utf-8');
    const lastUpdated = this.extractTimestamp(rawContent);
    const bodyContent = this.extractBodyContent(rawContent);
    const title = this.extractTitleFromContent(rawContent);
    const tags = this.extractTagsFromContent(rawContent);

    return {
      pageId: localDoc.pageId,
      title,
      lastUpdated,
      tags,
      bodyContent,
      rawContent,
      filePath: localDoc.filePath,
      fileName: localDoc.fileName,
    };
  }

  async updateTimestampOnly(filePath: string, newDate: Date): Promise<void> {
    const content = await readFile(filePath, 'utf-8');
    const updated = replaceTimestampInContent(content, newDate);
    await writeFile(filePath, updated, 'utf-8');
  }

  private extractTitleFromContent(content: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    return match?.[1]?.trim() ?? '';
  }

  private extractTagsFromContent(content: string): string[] {
    const match = content.match(/^\*\*Tags:\*\*\s*(.+)$/m);
    if (match?.[1] === undefined || match[1] === '') return [];
    return match[1].split(',').map((tag) => tag.trim());
  }
}
