import { DocumentationFile } from '@/src/types/doc-sync';

/**
 * Maps documentation files to relevant code files using content analysis and heuristics
 */
export class DocMapper {
  private readonly mappingCache: Map<string, string[]> = new Map();

  /**
   * Scans documentation content for explicit file path references
   * @param content - The documentation content to scan
   * @returns Array of file paths referenced in the documentation
   */
  extractFilePathReferences(content: string): string[] {
    const filePaths = new Set<string>();

    // Pattern 1: File paths wrapped in backticks: `src/index.ts`
    const backtickPattern = /`([^`]+\.[a-zA-Z]+)`/g;
    let match;
    while ((match = backtickPattern.exec(content)) !== null) {
      const path = match[1];
      if (this.isValidFilePath(path)) {
        filePaths.add(path);
      }
    }

    // Pattern 2: File paths in comments: // File: src/main.ts
    const commentPattern = /\/\/\s*File:\s*([^\s\n]+)/g;
    while ((match = commentPattern.exec(content)) !== null) {
      const path = match[1];
      if (this.isValidFilePath(path)) {
        filePaths.add(path);
      }
    }

    // Pattern 3: File paths in import/require statements
    const importFromPattern = /from\s+['"`]([^'"`]+\.[a-zA-Z]+)['"`]/g;
    while ((match = importFromPattern.exec(content)) !== null) {
      const path = match[1];
      if (this.isValidFilePath(path)) {
        filePaths.add(path);
      }
    }

    const requirePattern = /require\s*\(\s*['"`]([^'"`]+\.[a-zA-Z]+)['"`]\s*\)/g;
    while ((match = requirePattern.exec(content)) !== null) {
      const path = match[1];
      if (this.isValidFilePath(path)) {
        filePaths.add(path);
      }
    }

    // Pattern 4: File paths in markdown links: [text](./file.ext)
    const markdownLinkPattern = /\[([^\]]*)\]\(([^)]+\.[a-zA-Z]+)\)/g;
    while ((match = markdownLinkPattern.exec(content)) !== null) {
      const path = match[2];
      if (this.isValidFilePath(path)) {
        filePaths.add(path);
      }
    }

    return Array.from(filePaths);
  }

  /**
   * Helper method to validate if a string looks like a valid file path
   * @param path - The potential file path to validate
   * @returns true if the path looks like a valid file path
   */
  private isValidFilePath(path: string): boolean {
    // Must have a file extension
    if (!/\.[a-zA-Z]+$/.test(path)) {
      return false;
    }

    // Handle relative paths starting with ./
    if (path.startsWith('./')) {
      return path.length > 2 && /^\.\/[a-zA-Z0-9._/-]+$/.test(path);
    }

    // Should not be just a file extension like ".js"
    if (path.startsWith('.') && !path.includes('/')) {
      return false;
    }

    // Should contain path-like characters
    return /^[a-zA-Z0-9._/-]+$/.test(path);
  }

  /**
   * Extracts function name references from documentation content
   * @param content - The documentation content to scan
   * @returns Array of function names referenced in the documentation
   */
  extractFunctionNameReferences(content: string): string[] {
    const functionNames = new Set<string>();

    // Pattern 1: Function calls in backticks: `functionName()`
    const backtickFunctionPattern = /`([a-zA-Z_$][a-zA-Z0-9_$]*)\(\)`/g;
    let match;
    while ((match = backtickFunctionPattern.exec(content)) !== null) {
      functionNames.add(match[1]);
    }

    // Pattern 2: Function declarations in code blocks: function myFunction()
    const functionDeclarationPattern = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    while ((match = functionDeclarationPattern.exec(content)) !== null) {
      functionNames.add(match[1]);
    }

    // Pattern 3: Method calls in code: object.methodName()
    const methodCallPattern = /\.([a-zA-Z_$][a-zA-Z0-9_$]*)\(\)/g;
    while ((match = methodCallPattern.exec(content)) !== null) {
      functionNames.add(match[1]);
    }

    return Array.from(functionNames);
  }

  /**
   * Creates a mapping table of documentation files to relevant code files
   * @param documentationFiles - Array of documentation files to analyze
   * @param availableCodeFiles - Array of available code file paths
   * @returns Map of doc file paths to arrays of linked code file paths
   */
  buildMappingTable(
    documentationFiles: DocumentationFile[],
    availableCodeFiles: string[]
  ): Map<string, string[]> {
    const mappingTable = new Map<string, string[]>();

    for (const docFile of documentationFiles) {
      const linkedFiles = new Set<string>();

      // Extract file path references from the documentation content
      const referencedPaths = this.extractFilePathReferences(docFile.content);

      // Add any referenced paths that exist in available code files
      for (const refPath of referencedPaths) {
        if (availableCodeFiles.includes(refPath)) {
          linkedFiles.add(refPath);
        }
      }

      // Store the mapping
      mappingTable.set(docFile.filePath, Array.from(linkedFiles));
    }

    return mappingTable;
  }

  /**
   * Matches documentation filenames to code file patterns using heuristics
   * @param docFilePath - Path to the documentation file
   * @param availableCodeFiles - Array of available code file paths
   * @returns Array of potentially matching code files
   */
  matchFilenamePatterns(docFilePath: string, availableCodeFiles: string[]): string[] {
    const matches: string[] = [];

    // Extract the base name from the doc file (e.g., 'doc-mapper' from 'docs/doc-mapper.md')
    const docBaseName = this.extractBaseName(docFilePath);
    if (docBaseName === null) {
      return matches;
    }

    // Create variations of the doc name to search for
    const searchTerms = this.generateSearchTerms(docBaseName);

    for (const codeFile of availableCodeFiles) {
      const codeBaseName = this.extractBaseName(codeFile);
      if (codeBaseName === null) {
        continue;
      }

      // Check if any search term matches the code file base name (case-insensitive)
      const codeBaseNameLower = codeBaseName.toLowerCase();
      for (const term of searchTerms) {
        const termLower = term.toLowerCase();
        if (codeBaseNameLower.includes(termLower) || termLower.includes(codeBaseNameLower)) {
          matches.push(codeFile);
          break;
        }
      }
    }

    return matches;
  }

  /**
   * Helper method to extract base name from a file path (without extension and directory)
   * @param filePath - The file path to process
   * @returns The base name or null if extraction fails
   */
  private extractBaseName(filePath: string): string | null {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1] ?? '';
    const nameWithoutExt = fileName.split('.')[0];
    return nameWithoutExt !== undefined && nameWithoutExt !== '' ? nameWithoutExt : null;
  }

  /**
   * Helper method to generate search terms from a base name
   * @param baseName - The base name to generate terms from
   * @returns Array of search terms
   */
  private generateSearchTerms(baseName: string): string[] {
    const terms = new Set<string>();

    // Add the original name
    terms.add(baseName);

    // Handle hyphenated names (e.g., 'doc-mapper' -> ['doc', 'mapper'])
    const hyphenParts = baseName.split('-');
    if (hyphenParts.length > 1) {
      hyphenParts.forEach((part) => terms.add(part));
    }

    // Handle camelCase/PascalCase names
    const camelParts = baseName.split(/(?=[A-Z])/);
    if (camelParts.length > 1) {
      camelParts.forEach((part) => terms.add(part.toLowerCase()));
    }

    return Array.from(terms);
  }

  /**
   * Implements directory structure-based mapping
   * @param docFilePath - Path to the documentation file
   * @param availableCodeFiles - Array of available code file paths
   * @returns Array of code files in related directories
   */
  matchDirectoryStructure(docFilePath: string, availableCodeFiles: string[]): string[] {
    const matches: string[] = [];

    // Extract directory path from doc file (e.g., 'docs/components/button.md' -> ['components', 'button'])
    const docPathParts = this.extractPathParts(docFilePath);

    for (const codeFile of availableCodeFiles) {
      const codePathParts = this.extractPathParts(codeFile);

      // Check if the code file shares directory structure with the doc file
      if (this.hasMatchingDirectoryStructure(docPathParts, codePathParts)) {
        matches.push(codeFile);
      }
    }

    return matches;
  }

  /**
   * Helper method to extract meaningful path parts from a file path
   * @param filePath - The file path to process
   * @returns Array of path parts (excluding root 'src', 'docs', 'lib', etc.)
   */
  private extractPathParts(filePath: string): string[] {
    const parts = filePath.split('/');
    const filtered: string[] = [];

    for (const part of parts) {
      // Skip common root directories and the file name with extension
      if (
        part !== 'src' &&
        part !== 'docs' &&
        part !== 'lib' &&
        part !== 'tests' &&
        part !== 'test' &&
        !part.includes('.')
      ) {
        filtered.push(part);
      }
    }

    return filtered;
  }

  /**
   * Helper method to check if two path structures match
   * @param docParts - Path parts from documentation file
   * @param codeParts - Path parts from code file
   * @returns true if they share meaningful directory structure
   */
  private hasMatchingDirectoryStructure(docParts: string[], codeParts: string[]): boolean {
    if (docParts.length === 0 || codeParts.length === 0) {
      return false;
    }

    // Check if any doc path parts match code path parts
    for (const docPart of docParts) {
      if (codeParts.includes(docPart)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculates confidence score for mapping relationships
   * @param docFile - Documentation file to analyze
   * @param codeFile - Code file to check mapping confidence for
   * @returns Confidence score between 0 and 1
   */
  calculateMappingConfidence(docFile: DocumentationFile, codeFile: string): number {
    let confidence = 0;

    // High confidence: Explicit file path references (0.9)
    const referencedPaths = this.extractFilePathReferences(docFile.content);
    if (referencedPaths.includes(codeFile)) {
      confidence = Math.max(confidence, 0.9);
    }

    // Medium-high confidence: File path in linkedCodeFiles (0.85)
    if (docFile.linkedCodeFiles.includes(codeFile)) {
      confidence = Math.max(confidence, 0.85);
    }

    // Medium confidence: Function name matches with code file name (0.5-0.6)
    const functionNames = this.extractFunctionNameReferences(docFile.content);
    const codeBaseName = this.extractBaseName(codeFile);
    if (codeBaseName !== null) {
      for (const funcName of functionNames) {
        const funcLower = funcName.toLowerCase();
        const codeLower = codeBaseName.toLowerCase();
        if (
          funcLower.includes(codeLower) ||
          codeLower.includes(funcLower) ||
          this.similarWords(funcLower, codeLower)
        ) {
          confidence = Math.max(confidence, 0.5);
          break;
        }
      }
    }

    // Low-medium confidence: Filename pattern matches (0.3)
    const filenameMatches = this.matchFilenamePatterns(docFile.filePath, [codeFile]);
    if (filenameMatches.length > 0) {
      confidence = Math.max(confidence, 0.3);
    }

    // Low confidence: Directory structure matches (0.15)
    const directoryMatches = this.matchDirectoryStructure(docFile.filePath, [codeFile]);
    if (directoryMatches.length > 0) {
      confidence = Math.max(confidence, 0.15);
    }

    return confidence;
  }

  /**
   * Helper method to check if two words are similar (share common parts)
   * @param word1 - First word to compare
   * @param word2 - Second word to compare
   * @returns true if words share significant common parts
   */
  private similarWords(word1: string, word2: string): boolean {
    // Check if they share common substrings of length 4 or more
    const minLength = 4;
    for (let i = 0; i <= word1.length - minLength; i++) {
      const substring = word1.substring(i, i + minLength);
      if (word2.includes(substring)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Enhances DocumentationFile objects with linked code files
   * @param documentationFiles - Array of documentation files to enhance
   * @param availableCodeFiles - Array of available code file paths
   * @returns Array of enhanced DocumentationFile objects with linkedCodeFiles populated
   */
  enhanceDocumentationFiles(
    documentationFiles: DocumentationFile[],
    availableCodeFiles: string[]
  ): DocumentationFile[] {
    return documentationFiles.map((docFile) => {
      const linkedFiles = new Set<string>();

      // 1. Extract explicit file path references from content
      const referencedPaths = this.extractFilePathReferences(docFile.content);
      for (const refPath of referencedPaths) {
        if (availableCodeFiles.includes(refPath)) {
          linkedFiles.add(refPath);
        }
      }

      // 2. Add files from filename pattern matching
      const filenameMatches = this.matchFilenamePatterns(docFile.filePath, availableCodeFiles);
      for (const match of filenameMatches) {
        linkedFiles.add(match);
      }

      // 3. Add files from directory structure matching
      const directoryMatches = this.matchDirectoryStructure(docFile.filePath, availableCodeFiles);
      for (const match of directoryMatches) {
        linkedFiles.add(match);
      }

      // Convert Set to Array
      const linkedCodeFiles = Array.from(linkedFiles);

      // Calculate overall confidence score
      // Use the highest confidence among all linked files
      let maxConfidence = 0;
      for (const codeFile of linkedCodeFiles) {
        const confidence = this.calculateMappingConfidence(
          { ...docFile, linkedCodeFiles },
          codeFile
        );
        maxConfidence = Math.max(maxConfidence, confidence);
      }

      // Return enhanced documentation file
      return {
        ...docFile,
        linkedCodeFiles,
        mappingConfidence: maxConfidence,
      };
    });
  }

  /**
   * Caches mapping results for performance optimization
   * @param mappingTable - The mapping table to cache
   * @returns void
   */
  cacheMappingResults(mappingTable: Map<string, string[]>): void {
    // Store all entries from the mapping table into the cache
    for (const [docFilePath, codeFiles] of mappingTable.entries()) {
      this.mappingCache.set(docFilePath, [...codeFiles]);
    }
  }

  /**
   * Retrieves cached mapping results
   * @param docFilePath - Path to the documentation file
   * @returns Cached mapping results or null if not found
   */
  getCachedMappingResults(docFilePath: string): string[] | null {
    const cached = this.mappingCache.get(docFilePath);
    return cached ? [...cached] : null;
  }

  /**
   * Invalidates cached mapping results
   * @param docFilePath - Path to the documentation file to invalidate, or undefined to clear all
   * @returns void
   */
  invalidateMappingCache(docFilePath?: string): void {
    if (docFilePath === undefined) {
      // Clear all cache entries
      this.mappingCache.clear();
    } else {
      // Remove specific cache entry
      this.mappingCache.delete(docFilePath);
    }
  }
}
