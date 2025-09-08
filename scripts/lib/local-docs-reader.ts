import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { NotionDoc } from './notion-client';

/**
 * Interface for a local documentation file
 */
export interface LocalDocFile {
  readonly filePath: string;
  readonly fileName: string;
  readonly pageId: string;
}

/**
 * Utility for reading local documentation files and extracting page IDs
 */
export class LocalDocsReader {
  private readonly docsPath: string;

  constructor(docsPath: string) {
    this.docsPath = docsPath;
  }

  /**
   * Read all markdown files in the docs directory and extract page IDs
   */
  async readLocalDocs(): Promise<LocalDocFile[]> {
    try {
      console.log(`📂 Reading local docs from: ${this.docsPath}`);

      // Read all files in the directory
      const files = await readdir(this.docsPath);

      // Filter for markdown files
      const markdownFiles = files.filter((file) => extname(file) === '.md');
      console.log(`  Found ${markdownFiles.length} markdown files`);

      const localDocs: LocalDocFile[] = [];

      for (const fileName of markdownFiles) {
        const filePath = join(this.docsPath, fileName);

        try {
          console.log(`  Reading: ${fileName}`);

          // Read the file content
          const content = await readFile(filePath, 'utf-8');

          // Extract page ID
          const pageId = this.extractPageId(content);

          if (pageId) {
            localDocs.push({
              filePath,
              fileName,
              pageId,
            });
            console.log(`    ✅ Found pageId: ${pageId}`);
          } else {
            console.log(`    ⚠️ No pageId found in ${fileName}`);
          }
        } catch (error) {
          console.error(`    ❌ Error reading ${fileName}:`, error);
        }
      }

      console.log(`📄 Successfully found ${localDocs.length} files with page IDs`);
      return localDocs;
    } catch (error) {
      console.error('Error reading local docs:', error);
      throw new Error(`Failed to read local docs: ${error}`);
    }
  }

  /**
   * Extract page ID from file content
   */
  private extractPageId(content: string): string | null {
    // Look for pageId=THE_PAGE_ID pattern
    const pageIdMatch = content.match(/pageId=([a-f0-9]+)/i);

    if (pageIdMatch && pageIdMatch[1]) {
      return pageIdMatch[1];
    }

    // Also try alternative formats
    const altMatch = content.match(/page[_-]?id[:\s]*([a-f0-9]+)/i);

    if (altMatch && altMatch[1]) {
      return altMatch[1];
    }

    return null;
  }

  /**
   * Get all page IDs from local docs
   */
  async getPageIds(): Promise<string[]> {
    const localDocs = await this.readLocalDocs();
    return localDocs.map((doc) => doc.pageId);
  }

  /**
   * Update local documentation files with fresh content from Notion
   */
  async updateLocalDocs(notionDocs: NotionDoc[]): Promise<void> {
    console.log(`💾 Updating ${notionDocs.length} local documentation files...`);

    const localDocs = await this.readLocalDocs();

    for (const notionDoc of notionDocs) {
      // Find the corresponding local file (normalize IDs by removing hyphens)
      const normalizedNotionId = notionDoc.id.replace(/-/g, '');
      const localDoc = localDocs.find((doc) => doc.pageId.replace(/-/g, '') === normalizedNotionId);

      if (!localDoc) {
        console.log(
          `  ⚠️ No local file found for page ${notionDoc.id} (normalized: ${normalizedNotionId})`
        );
        continue;
      }

      try {
        console.log(`  Updating: ${localDoc.fileName}`);

        // Read the current file to preserve the pageId line
        const currentContent = await readFile(localDoc.filePath, 'utf-8');
        const pageIdLine = this.extractPageIdLine(currentContent);

        // Build new content with preserved pageId line
        const newContent = this.buildUpdatedContent(pageIdLine, notionDoc);

        // Write the updated content back to the file
        await writeFile(localDoc.filePath, newContent, 'utf-8');

        console.log(`    ✅ Updated ${localDoc.fileName}`);
      } catch (error) {
        console.error(`    ❌ Failed to update ${localDoc.fileName}:`, error);
      }
    }

    console.log(`📝 Finished updating local documentation files`);
  }

  /**
   * Extract the pageId line from existing content
   */
  private extractPageIdLine(content: string): string {
    const lines = content.split('\n');
    const pageIdLine = lines.find((line) => line.match(/pageId=/i));

    if (pageIdLine) {
      return pageIdLine.trim();
    }

    // Fallback - extract pageId and create line
    const pageId = this.extractPageId(content);
    return pageId ? `pageId=${pageId}` : '';
  }

  /**
   * Build the updated file content with pageId preserved at the top
   */
  private buildUpdatedContent(pageIdLine: string, notionDoc: NotionDoc): string {
    const lines: string[] = [];

    // Add pageId line at the top
    if (pageIdLine) {
      lines.push(pageIdLine);
      lines.push(''); // Empty line after pageId
    }

    // Add title if available
    if (notionDoc.title && notionDoc.title.trim() !== '') {
      lines.push(`# ${notionDoc.title}`);
      lines.push('');
    }

    // Add last modified info
    lines.push(`*Last updated: ${notionDoc.lastModified.toISOString().split('T')[0]}*`);
    lines.push('');

    // Add tags if available
    if (notionDoc.tags && notionDoc.tags.length > 0) {
      lines.push(`**Tags:** ${notionDoc.tags.join(', ')}`);
      lines.push('');
    }

    // Add main content
    if (notionDoc.content && notionDoc.content.trim() !== '') {
      lines.push(notionDoc.content.trim());
    } else {
      lines.push('*No content available*');
    }

    // Add final newline
    return lines.join('\n') + '\n';
  }
}
