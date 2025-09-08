import { NotionClient, NotionDoc } from './notion-client';
import { CodeAnalyzer, CodeStructure, CodeFunction, CodeClass } from './code-analyzer';

/**
 * Types of sync issues
 */
export type SyncIssueType = 'error' | 'warning' | 'info';

/**
 * Interface for sync check results
 */
export interface SyncIssue {
  readonly type: SyncIssueType;
  readonly message: string;
  readonly source: 'code' | 'notion' | 'both';
  readonly filePath?: string;
  readonly notionPageId?: string;
}

/**
 * Checker for documentation synchronization
 */
export class DocSyncChecker {
  constructor(
    private readonly notionClient: NotionClient,
    private readonly codeAnalyzer: CodeAnalyzer
  ) {}

  /**
   * Check synchronization between Notion docs and code
   */
  async checkSync(docs: NotionDoc[], codeStructure: CodeStructure): Promise<SyncIssue[]> {
    const issues: SyncIssue[] = [];

    // Check for orphaned documentation (docs without corresponding code)
    issues.push(...this.checkOrphanedDocs(docs, codeStructure));

    // Check for undocumented code (code without corresponding docs)
    issues.push(...this.checkUndocumentedCode(docs, codeStructure));

    // Check for outdated documentation
    issues.push(...(await this.checkOutdatedDocs(docs, codeStructure)));

    // Check for broken links
    issues.push(...this.checkBrokenLinks(docs));

    return issues;
  }

  /**
   * Check for documentation pages that don't have corresponding code
   */
  private checkOrphanedDocs(docs: NotionDoc[], codeStructure: CodeStructure): SyncIssue[] {
    const issues: SyncIssue[] = [];
    const allCodeNames = [
      ...codeStructure.functions.map((f) => f.name),
      ...codeStructure.classes.map((c) => c.name),
      ...codeStructure.exports,
    ];

    for (const doc of docs) {
      if (doc.linkedCodeFile) {
        // Check if the linked file exists in code structure
        const hasCorrespondingCode =
          codeStructure.functions.some((f) => f.file.includes(doc.linkedCodeFile!)) ||
          codeStructure.classes.some((c) => c.file.includes(doc.linkedCodeFile!));

        if (!hasCorrespondingCode) {
          issues.push({
            type: 'warning',
            message: `Documentation "${doc.title}" links to non-existent file: ${doc.linkedCodeFile}`,
            source: 'notion',
            notionPageId: doc.id,
          });
        }
      } else {
        // Check if doc title matches any code entity
        const hasMatchingCode = allCodeNames.some(
          (name) =>
            name.toLowerCase() === doc.title.toLowerCase() ||
            doc.title.toLowerCase().includes(name.toLowerCase())
        );

        if (!hasMatchingCode && !doc.tags.includes('general')) {
          issues.push({
            type: 'info',
            message: `Documentation "${doc.title}" may not have corresponding code`,
            source: 'notion',
            notionPageId: doc.id,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check for code that doesn't have corresponding documentation
   */
  private checkUndocumentedCode(docs: NotionDoc[], codeStructure: CodeStructure): SyncIssue[] {
    const issues: SyncIssue[] = [];
    const docTitles = docs.map((d) => d.title.toLowerCase());

    // Check public functions that should be documented
    for (const func of codeStructure.functions) {
      if (func.isPublic && func.notionSyncTag) {
        const hasDoc = docTitles.some(
          (title) =>
            title.includes(func.name.toLowerCase()) ||
            docs.some((d) => d.linkedCodeFile === func.file)
        );

        if (!hasDoc) {
          issues.push({
            type: 'warning',
            message: `Public function "${func.name}" has @notion-sync tag but no documentation`,
            source: 'code',
            filePath: func.file,
          });
        }
      }
    }

    // Check exported classes that should be documented
    for (const cls of codeStructure.classes) {
      if (cls.isExported && cls.notionSyncTag) {
        const hasDoc = docTitles.some(
          (title) =>
            title.includes(cls.name.toLowerCase()) ||
            docs.some((d) => d.linkedCodeFile === cls.file)
        );

        if (!hasDoc) {
          issues.push({
            type: 'warning',
            message: `Exported class "${cls.name}" has @notion-sync tag but no documentation`,
            source: 'code',
            filePath: cls.file,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check for documentation that is older than corresponding code
   */
  private async checkOutdatedDocs(
    docs: NotionDoc[],
    codeStructure: CodeStructure
  ): Promise<SyncIssue[]> {
    const issues: SyncIssue[] = [];

    for (const doc of docs) {
      if (doc.linkedCodeFile) {
        try {
          const codeLastModified = await this.codeAnalyzer.getFileLastModified(doc.linkedCodeFile);

          if (codeLastModified > doc.lastModified) {
            const daysDiff = Math.floor(
              (codeLastModified.getTime() - doc.lastModified.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysDiff > 7) {
              issues.push({
                type: 'error',
                message: `Documentation "${doc.title}" is ${daysDiff} days outdated (code modified: ${codeLastModified.toDateString()}, doc modified: ${doc.lastModified.toDateString()})`,
                source: 'both',
                filePath: doc.linkedCodeFile,
                notionPageId: doc.id,
              });
            } else if (daysDiff > 1) {
              issues.push({
                type: 'warning',
                message: `Documentation "${doc.title}" may be outdated (code modified: ${codeLastModified.toDateString()}, doc modified: ${doc.lastModified.toDateString()})`,
                source: 'both',
                filePath: doc.linkedCodeFile,
                notionPageId: doc.id,
              });
            }
          }
        } catch (error) {
          issues.push({
            type: 'warning',
            message: `Cannot check modification time for file linked to "${doc.title}": ${doc.linkedCodeFile}`,
            source: 'notion',
            notionPageId: doc.id,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check for broken links in documentation
   */
  private checkBrokenLinks(docs: NotionDoc[]): SyncIssue[] {
    const issues: SyncIssue[] = [];

    for (const doc of docs) {
      // Check for broken internal links
      const linkMatches = doc.content.match(/\[([^\]]+)\]\(([^)]+)\)/g);

      if (linkMatches) {
        for (const match of linkMatches) {
          const linkMatch = match.match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (linkMatch) {
            const [, linkText, linkUrl] = linkMatch;

            // Check for relative file paths that might be broken
            if (linkUrl.startsWith('./') || linkUrl.startsWith('../')) {
              issues.push({
                type: 'info',
                message: `Documentation "${doc.title}" contains relative link that should be verified: ${linkText} -> ${linkUrl}`,
                source: 'notion',
                notionPageId: doc.id,
              });
            }
          }
        }
      }
    }

    return issues;
  }

  /**
   * Generate a summary report of sync status
   */
  generateSummary(issues: SyncIssue[]): string {
    const errors = issues.filter((i) => i.type === 'error').length;
    const warnings = issues.filter((i) => i.type === 'warning').length;
    const infos = issues.filter((i) => i.type === 'info').length;

    let summary = '\n📊 Sync Status Summary:\n';
    summary += `   Errors: ${errors}\n`;
    summary += `   Warnings: ${warnings}\n`;
    summary += `   Info: ${infos}\n`;

    if (errors === 0 && warnings === 0) {
      summary += '\n✅ Documentation is fully synchronized!';
    } else if (errors === 0) {
      summary += '\n⚠️  Minor issues detected but sync is acceptable';
    } else {
      summary += '\n❌ Critical sync issues require attention';
    }

    return summary;
  }
}
