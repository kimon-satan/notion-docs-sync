import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for a code function/method
 */
export interface CodeFunction {
  readonly name: string;
  readonly file: string;
  readonly line: number;
  readonly description?: string;
  readonly parameters: string[];
  readonly returnType?: string;
  readonly isPublic: boolean;
  readonly lastModified: Date;
  readonly notionSyncTag?: string;
}

/**
 * Interface for a code class
 */
export interface CodeClass {
  readonly name: string;
  readonly file: string;
  readonly line: number;
  readonly description?: string;
  readonly methods: CodeFunction[];
  readonly isExported: boolean;
  readonly lastModified: Date;
  readonly notionSyncTag?: string;
}

/**
 * Interface for code structure analysis
 */
export interface CodeStructure {
  readonly functions: CodeFunction[];
  readonly classes: CodeClass[];
  readonly exports: string[];
  readonly lastAnalyzed: Date;
}

/**
 * Analyzer for TypeScript/JavaScript code
 */
export class CodeAnalyzer {
  private readonly sourceDir: string;

  constructor(sourceDir: string) {
    this.sourceDir = sourceDir;
  }

  /**
   * Analyze the entire codebase
   */
  async analyzeCodebase(): Promise<CodeStructure> {
    console.log(`🔍 Analyzing codebase in ${this.sourceDir}...`);

    const files = await this.findCodeFiles(this.sourceDir);
    const functions: CodeFunction[] = [];
    const classes: CodeClass[] = [];
    const exports: string[] = [];

    for (const file of files) {
      try {
        const analysis = await this.analyzeFile(file);
        functions.push(...analysis.functions);
        classes.push(...analysis.classes);
        exports.push(...analysis.exports);
      } catch (error) {
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }

    return {
      functions,
      classes,
      exports,
      lastAnalyzed: new Date(),
    };
  }

  /**
   * Find all TypeScript/JavaScript files in the source directory
   */
  private async findCodeFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
        const subFiles = await this.findCodeFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && this.isCodeFile(entry.name)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Check if directory should be skipped
   */
  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = ['node_modules', '.git', 'dist', 'coverage', '__tests__'];
    return skipDirs.includes(name);
  }

  /**
   * Check if file is a code file
   */
  private isCodeFile(filename: string): boolean {
    const extensions = ['.ts', '.js', '.tsx', '.jsx'];
    const isTestFile = filename.includes('.test.') || filename.includes('.spec.');
    return extensions.some((ext) => filename.endsWith(ext)) && !isTestFile;
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(filePath: string): Promise<{
    functions: CodeFunction[];
    classes: CodeClass[];
    exports: string[];
  }> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const stats = await fs.promises.stat(filePath);
    const lastModified = stats.mtime;

    const functions = this.extractFunctions(content, filePath, lastModified);
    const classes = this.extractClasses(content, filePath, lastModified);
    const exports = this.extractExports(content);

    return { functions, classes, exports };
  }

  /**
   * Extract function definitions from code
   */
  private extractFunctions(content: string, filePath: string, lastModified: Date): CodeFunction[] {
    const functions: CodeFunction[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match function declarations (simplified regex)
      const functionMatch = line.match(
        /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\((.*?)\)(?:\s*:\s*(.*?))?\s*\{?/
      );
      if (functionMatch) {
        const [, name, params, returnType] = functionMatch;

        const func: CodeFunction = {
          name,
          file: filePath,
          line: i + 1,
          description: this.extractPrecedingComment(lines, i),
          parameters: params
            .split(',')
            .map((p) => p.trim())
            .filter((p) => p),
          returnType: returnType?.trim(),
          isPublic: line.includes('export'),
          lastModified,
          notionSyncTag: this.extractNotionSyncTag(lines, i),
        };

        functions.push(func);
      }

      // Match arrow functions
      const arrowMatch = line.match(
        /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\((.*?)\)(?:\s*:\s*(.*?))?\s*=>/
      );
      if (arrowMatch) {
        const [, name, params, returnType] = arrowMatch;

        const func: CodeFunction = {
          name,
          file: filePath,
          line: i + 1,
          description: this.extractPrecedingComment(lines, i),
          parameters: params
            .split(',')
            .map((p) => p.trim())
            .filter((p) => p),
          returnType: returnType?.trim(),
          isPublic: line.includes('export'),
          lastModified,
          notionSyncTag: this.extractNotionSyncTag(lines, i),
        };

        functions.push(func);
      }
    }

    return functions;
  }

  /**
   * Extract class definitions from code
   */
  private extractClasses(content: string, filePath: string, lastModified: Date): CodeClass[] {
    const classes: CodeClass[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const classMatch = line.match(/(?:export\s+)?class\s+(\w+)/);
      if (classMatch) {
        const [, name] = classMatch;

        const classObj: CodeClass = {
          name,
          file: filePath,
          line: i + 1,
          description: this.extractPrecedingComment(lines, i),
          methods: [], // TODO: Extract methods
          isExported: line.includes('export'),
          lastModified,
          notionSyncTag: this.extractNotionSyncTag(lines, i),
        };

        classes.push(classObj);
      }
    }

    return classes;
  }

  /**
   * Extract export statements
   */
  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const exportMatch = line.match(
        /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/
      );
      if (exportMatch) {
        exports.push(exportMatch[1]);
      }

      // Named exports
      const namedExportMatch = line.match(/export\s*\{\s*([^}]+)\s*\}/);
      if (namedExportMatch) {
        const names = namedExportMatch[1].split(',').map((n) => n.trim());
        exports.push(...names);
      }
    }

    return exports;
  }

  /**
   * Extract comment preceding a line
   */
  private extractPrecedingComment(lines: string[], lineIndex: number): string | undefined {
    let comment = '';
    let i = lineIndex - 1;

    // Look for JSDoc comment
    while (i >= 0 && lines[i].trim().startsWith('*')) {
      comment = lines[i].trim() + '\n' + comment;
      i--;
    }

    if (i >= 0 && lines[i].trim().startsWith('/**')) {
      comment = lines[i].trim() + '\n' + comment;
    }

    return comment.trim() || undefined;
  }

  /**
   * Extract @notion-sync tag from comments
   */
  private extractNotionSyncTag(lines: string[], lineIndex: number): string | undefined {
    let i = lineIndex - 1;

    while (i >= 0 && (lines[i].trim().startsWith('*') || lines[i].trim().startsWith('/'))) {
      const syncMatch = lines[i].match(/@notion-sync:\s*(.+)/);
      if (syncMatch) {
        return syncMatch[1].trim();
      }
      i--;
    }

    return undefined;
  }

  /**
   * Get file modification time
   */
  async getFileLastModified(filePath: string): Promise<Date> {
    const stats = await fs.promises.stat(filePath);
    return stats.mtime;
  }
}
