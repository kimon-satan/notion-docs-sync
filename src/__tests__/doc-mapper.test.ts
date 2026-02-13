import { describe, it, expect, beforeEach } from 'vitest';
import { DocMapper } from '../lib/doc-mapper';
import { DocumentationFile } from '../types/doc-sync';

describe('DocMapper', () => {
  let docMapper: DocMapper;

  beforeEach(() => {
    docMapper = new DocMapper();
  });

  describe('Content-based mapping', () => {
    describe('extractFilePathReferences', () => {
      it('should extract explicit file path references from markdown', () => {
        const content = `
# My Documentation

This file covers the functionality in \`src/index.ts\` and \`lib/utils.js\`.

See also:
- \`scripts/build.ts\`
- \`src/components/Button.tsx\`
        `;

        const result = docMapper.extractFilePathReferences(content);
        expect(result).toEqual([
          'src/index.ts',
          'lib/utils.js',
          'scripts/build.ts',
          'src/components/Button.tsx',
        ]);
      });

      it('should handle file paths in different markdown formats', () => {
        const content = `
\`\`\`typescript
// File: src/main.ts
import { helper } from './utils/helper.ts';
\`\`\`

Reference to [config.json](./config.json) and \`package.json\`.
        `;

        const result = docMapper.extractFilePathReferences(content);
        expect(result).toContain('src/main.ts');
        expect(result).toContain('./utils/helper.ts');
        expect(result).toContain('./config.json');
        expect(result).toContain('package.json');
      });

      it('should return empty array when no file references found', () => {
        const content = 'This is just regular text without any file references.';
        const result = docMapper.extractFilePathReferences(content);
        expect(result).toEqual([]);
      });
    });

    describe('extractFunctionNameReferences', () => {
      it('should extract function names wrapped in backticks', () => {
        const content = `
# API Documentation

The main functions are \`generatePoem()\`, \`validateInput()\`, and \`processData()\`.

Call \`initializeApp()\` before using other functions.
        `;

        const result = docMapper.extractFunctionNameReferences(content);
        expect(result).toEqual(['generatePoem', 'validateInput', 'processData', 'initializeApp']);
      });

      it('should handle function references in code blocks', () => {
        const content = `
\`\`\`typescript
function myFunction() {
  return helper.calculateValue();
}
\`\`\`

The \`calculateValue()\` function is important.
        `;

        const result = docMapper.extractFunctionNameReferences(content);
        expect(result).toContain('calculateValue');
        expect(result).toContain('myFunction');
      });

      it('should return empty array when no function references found', () => {
        const content = 'This documentation has no function references.';
        const result = docMapper.extractFunctionNameReferences(content);
        expect(result).toEqual([]);
      });
    });

    describe('buildMappingTable', () => {
      it('should create mapping table from documentation analysis', () => {
        const documentationFiles: DocumentationFile[] = [
          {
            filePath: 'docs/api.md',
            content: 'Functions: `generatePoem()` in `src/generator.ts`',
            linkedCodeFiles: [],
            mappingConfidence: 0,
          },
          {
            filePath: 'docs/utils.md',
            content: 'Utilities in `src/utils.ts` and `lib/helpers.js`',
            linkedCodeFiles: [],
            mappingConfidence: 0,
          },
        ];

        const availableCodeFiles = [
          'src/generator.ts',
          'src/utils.ts',
          'lib/helpers.js',
          'src/index.ts',
        ];

        const result = docMapper.buildMappingTable(documentationFiles, availableCodeFiles);

        expect(result.get('docs/api.md')).toContain('src/generator.ts');
        expect(result.get('docs/utils.md')).toContain('src/utils.ts');
        expect(result.get('docs/utils.md')).toContain('lib/helpers.js');
      });

      it('should handle empty documentation files', () => {
        const result = docMapper.buildMappingTable([], []);
        expect(result).toBeInstanceOf(Map);
        expect(result.size).toBe(0);
      });
    });
  });

  describe('Heuristic matching', () => {
    describe('matchFilenamePatterns', () => {
      it('should match documentation files to corresponding code files', () => {
        const availableCodeFiles = [
          'src/doc-mapper.ts',
          'src/git-analyzer.ts',
          'src/report-generator.ts',
          'src/index.ts',
        ];

        const result = docMapper.matchFilenamePatterns('docs/doc-mapper.md', availableCodeFiles);
        expect(result).toContain('src/doc-mapper.ts');
      });

      it('should handle different file extensions and patterns', () => {
        const availableCodeFiles = [
          'src/components/Button.tsx',
          'src/components/Input.tsx',
          'lib/button-utils.js',
          'tests/button.test.ts',
        ];

        const result = docMapper.matchFilenamePatterns(
          'docs/button-component.md',
          availableCodeFiles
        );
        expect(result).toContain('src/components/Button.tsx');
        expect(result).toContain('lib/button-utils.js');
      });

      it('should return empty array when no patterns match', () => {
        const availableCodeFiles = ['src/unrelated.ts', 'lib/other.js'];
        const result = docMapper.matchFilenamePatterns('docs/unique-doc.md', availableCodeFiles);
        expect(result).toEqual([]);
      });
    });

    describe('matchDirectoryStructure', () => {
      it('should match files in related directory structures', () => {
        const availableCodeFiles = [
          'src/components/Button.tsx',
          'src/components/Input.tsx',
          'src/utils/helpers.ts',
          'tests/components/button.test.ts',
        ];

        const result = docMapper.matchDirectoryStructure(
          'docs/components/button.md',
          availableCodeFiles
        );
        expect(result).toContain('src/components/Button.tsx');
        expect(result).toContain('tests/components/button.test.ts');
      });

      it('should handle nested directory structures', () => {
        const availableCodeFiles = [
          'src/lib/utils/string-helpers.ts',
          'src/lib/utils/number-helpers.ts',
          'src/other/file.ts',
        ];

        const result = docMapper.matchDirectoryStructure(
          'docs/lib/utils/helpers.md',
          availableCodeFiles
        );
        expect(result).toContain('src/lib/utils/string-helpers.ts');
        expect(result).toContain('src/lib/utils/number-helpers.ts');
        expect(result).not.toContain('src/other/file.ts');
      });
    });

    describe('calculateMappingConfidence', () => {
      it('should return high confidence for explicit file path matches', () => {
        const docFile: DocumentationFile = {
          filePath: 'docs/api.md',
          content: 'This documents `src/generator.ts`',
          linkedCodeFiles: ['src/generator.ts'],
          mappingConfidence: 0,
        };

        const confidence = docMapper.calculateMappingConfidence(docFile, 'src/generator.ts');
        expect(confidence).toBeGreaterThan(0.8);
      });

      it('should return medium confidence for function name matches', () => {
        const docFile: DocumentationFile = {
          filePath: 'docs/api.md',
          content: 'The `generatePoem()` function is useful',
          linkedCodeFiles: [],
          mappingConfidence: 0,
        };

        const confidence = docMapper.calculateMappingConfidence(docFile, 'src/poem-generator.ts');
        expect(confidence).toBeGreaterThan(0.4);
        expect(confidence).toBeLessThan(0.8);
      });

      it('should return low confidence for filename pattern matches only', () => {
        const docFile: DocumentationFile = {
          filePath: 'docs/generator.md',
          content: 'Generic documentation content',
          linkedCodeFiles: [],
          mappingConfidence: 0,
        };

        const confidence = docMapper.calculateMappingConfidence(docFile, 'src/generator.ts');
        expect(confidence).toBeGreaterThan(0.1);
        expect(confidence).toBeLessThan(0.5);
      });

      it('should return very low confidence for no matches', () => {
        const docFile: DocumentationFile = {
          filePath: 'docs/unrelated.md',
          content: 'Completely unrelated content',
          linkedCodeFiles: [],
          mappingConfidence: 0,
        };

        const confidence = docMapper.calculateMappingConfidence(docFile, 'src/generator.ts');
        expect(confidence).toBeLessThan(0.2);
      });
    });
  });

  describe('LocalDocsReader integration', () => {
    describe('enhanceDocumentationFiles', () => {
      it('should populate linkedCodeFiles for documentation files', () => {
        const documentationFiles: DocumentationFile[] = [
          {
            filePath: 'docs/generator.md',
            content: 'Documents `src/generator.ts` and `generatePoem()`',
            linkedCodeFiles: [],
            mappingConfidence: 0,
          },
        ];

        const availableCodeFiles = ['src/generator.ts', 'src/utils.ts', 'tests/generator.test.ts'];

        const result = docMapper.enhanceDocumentationFiles(documentationFiles, availableCodeFiles);

        expect(result).toHaveLength(1);
        expect(result[0].linkedCodeFiles).toContain('src/generator.ts');
        expect(result[0].mappingConfidence).toBeGreaterThan(0);
      });

      it('should update mappingConfidence scores', () => {
        const documentationFiles: DocumentationFile[] = [
          {
            filePath: 'docs/api.md',
            content: 'Strong reference to `src/main.ts`',
            linkedCodeFiles: [],
            mappingConfidence: 0,
          },
        ];

        const availableCodeFiles = ['src/main.ts'];
        const result = docMapper.enhanceDocumentationFiles(documentationFiles, availableCodeFiles);

        expect(result[0].mappingConfidence).toBeGreaterThan(0.5);
      });
    });
  });

  describe('Caching system', () => {
    describe('cacheMappingResults', () => {
      it('should cache mapping table results', () => {
        const mappingTable = new Map([
          ['docs/api.md', ['src/generator.ts']],
          ['docs/utils.md', ['src/utils.ts']],
        ]);

        expect(() => docMapper.cacheMappingResults(mappingTable)).not.toThrow();
      });
    });

    describe('getCachedMappingResults', () => {
      it('should retrieve cached results when available', () => {
        // First cache some results
        const mappingTable = new Map([['docs/api.md', ['src/generator.ts']]]);
        docMapper.cacheMappingResults(mappingTable);

        const result = docMapper.getCachedMappingResults('docs/api.md');
        expect(result).toEqual(['src/generator.ts']);
      });

      it('should return null when no cached results found', () => {
        const result = docMapper.getCachedMappingResults('docs/nonexistent.md');
        expect(result).toBeNull();
      });
    });

    describe('invalidateMappingCache', () => {
      it('should invalidate specific file cache', () => {
        // Cache some results first
        const mappingTable = new Map([['docs/api.md', ['src/generator.ts']]]);
        docMapper.cacheMappingResults(mappingTable);

        docMapper.invalidateMappingCache('docs/api.md');
        const result = docMapper.getCachedMappingResults('docs/api.md');
        expect(result).toBeNull();
      });

      it('should clear all cache when no file specified', () => {
        // Cache some results first
        const mappingTable = new Map([
          ['docs/api.md', ['src/generator.ts']],
          ['docs/utils.md', ['src/utils.ts']],
        ]);
        docMapper.cacheMappingResults(mappingTable);

        docMapper.invalidateMappingCache();

        expect(docMapper.getCachedMappingResults('docs/api.md')).toBeNull();
        expect(docMapper.getCachedMappingResults('docs/utils.md')).toBeNull();
      });
    });
  });
});
