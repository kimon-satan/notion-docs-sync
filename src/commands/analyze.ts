/* eslint-disable no-console */
import { readFile } from 'fs/promises';

import { resolveConfig } from '@/src/lib/config';
import { GitAnalyzer } from '@/src/lib/git-analyzer';
import { DocMapper } from '@/src/lib/doc-mapper';
import { LocalDocsReader } from '@/src/lib/local-docs-reader';
import { DocumentationFile } from '@/src/types/doc-sync';

export interface AnalyzeOptions {
  readonly baseBranch?: string;
  readonly targetBranch?: string;
}

export async function analyzeCommand(options: AnalyzeOptions): Promise<void> {
  const config = resolveConfig();
  const baseBranch = options.baseBranch ?? 'main';
  const targetBranch = options.targetBranch ?? 'HEAD';

  console.log(`Analyzing changes between ${baseBranch} and ${targetBranch}...`);

  const gitAnalyzer = new GitAnalyzer();
  const changes = gitAnalyzer.getCodeChanges(baseBranch, targetBranch);

  if (changes.length === 0) {
    console.log('No code changes detected between branches.');
    return;
  }

  console.log(`Found ${changes.length} changed code file(s)`);

  const localDocsReader = new LocalDocsReader(config.analysis.docsDir);
  const localDocs = await localDocsReader.readLocalDocs();

  const documentationFiles: DocumentationFile[] = [];
  for (const doc of localDocs) {
    const content = await readFile(doc.filePath, 'utf-8');
    documentationFiles.push({
      filePath: doc.filePath,
      content,
      linkedCodeFiles: [],
      mappingConfidence: 0,
    });
  }

  const changedFilePaths = changes.map((c) => c.filePath);
  const docMapper = new DocMapper();
  const enhanced = docMapper.enhanceDocumentationFiles(documentationFiles, changedFilePaths);

  const affected = enhanced.filter((doc) => doc.linkedCodeFiles.length > 0);

  if (affected.length === 0) {
    console.log('No documentation files are linked to the changed code files.');
    return;
  }

  console.log('\nDocumentation files potentially affected by code changes:\n');
  console.log(
    padRight('Document', 40) + padRight('Linked Code Files', 45) + padRight('Confidence', 12)
  );
  console.log('-'.repeat(97));

  for (const doc of affected) {
    const docName = doc.filePath;
    const linkedFiles = doc.linkedCodeFiles.join(', ');
    const confidence = (doc.mappingConfidence * 100).toFixed(0) + '%';
    console.log(padRight(docName, 40) + padRight(linkedFiles, 45) + padRight(confidence, 12));
  }
}

function padRight(str: string, length: number): string {
  if (str.length >= length) {
    return str.substring(0, length - 3) + '...';
  }
  return str + ' '.repeat(length - str.length);
}
