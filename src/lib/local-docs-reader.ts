import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { NotionDoc } from './notion-client';

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

    lines.push(`*Last updated: ${notionDoc.lastModified.toISOString().split('T')[0]}*`);
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
}
