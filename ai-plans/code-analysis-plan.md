# Code Analysis Plan: Documentation Sync Analyzer

_Created: 15 September 2025_

## Overview

This plan outlines the implementation of an automated system that uses LLM analysis to compare markdown documentation against git diffs between branches, identifying documentation that needs updating based on code changes.

## Architecture

The system follows a 4-stage process:

1. **Git Analysis** - Extract code changes between branches
2. **Documentation Mapping** - Link docs to relevant code files
3. **LLM Analysis** - Determine if docs need updates
4. **Report Generation** - Output actionable recommendations

## File Structure

### New Files to Create

```
scripts/
├── analyze-doc-sync.ts           # Main CLI entry point
├── lib/
│   ├── git-analyzer.ts          # Git diff extraction and analysis
│   ├── doc-mapper.ts            # Documentation-to-code mapping
│   ├── llm-analyzer.ts          # LLM integration and analysis
│   └── report-generator.ts      # Output formatting and reporting
├── types/
│   └── doc-sync.ts              # TypeScript interfaces and types
└── __tests__/
    ├── git-analyzer.test.ts     # Tests for git analysis
    ├── doc-mapper.test.ts       # Tests for documentation mapping
    ├── llm-analyzer.test.ts     # Tests for LLM integration
    ├── report-generator.test.ts # Tests for report generation
    ├── analyze-doc-sync.test.ts # Integration tests for CLI
    └── fixtures/
        ├── sample-git-diffs/    # Sample git diff outputs
        ├── sample-docs/         # Sample documentation files
        └── sample-llm-responses/ # Sample LLM API responses
```

### Files to Modify

```
scripts/lib/config.ts            # Add LLM configuration
package.json                     # Add new npm script and test script
```

---

## Stage 1: Git Integration & Change Detection ✅ COMPLETED

**Goal**: Extract and analyze code changes between git branches

### Files:

- **Create**: `scripts/types/doc-sync.ts` - TypeScript interfaces ✅
- **Create**: `scripts/lib/git-analyzer.ts` - Git analysis logic ✅

### Actions:

1. **Create git diff utilities** (`scripts/lib/git-analyzer.ts`) ✅
   - Implement `getCodeChanges()` to extract changed files between branches ✅
   - Parse git status and diff output into structured `CodeChange` objects ✅
   - Filter for source code files only (`.ts`, `.js`, etc.) ✅

2. **Build change analysis** (`scripts/lib/git-analyzer.ts`) ✅
   - Count lines added/removed per file ✅
   - Categorize changes as `added`, `modified`, or `deleted` ✅
   - Extract actual diff content for LLM analysis ✅

3. **Add error handling** (`scripts/lib/git-analyzer.ts`) ✅
   - Handle cases where branches don't exist ✅
   - Gracefully handle git command failures ✅
   - Validate git repository state ✅

### Tests:

- **Create**: `scripts/__tests__/git-analyzer.test.ts` - Unit tests for git analysis ✅
- **Create**: `scripts/__tests__/fixtures/sample-git-diffs/` - Test fixtures ✅

### Test Specifications:

1. **Git diff utilities tests** (`scripts/__tests__/git-analyzer.test.ts`) ✅
   - Test `getCodeChanges()` with various git diff outputs ✅
   - Verify proper parsing of git status into `CodeChange` objects ✅
   - Test source code file filtering (include `.ts/.js`, exclude tests/node_modules) ✅

2. **Change analysis tests** (`scripts/__tests__/git-analyzer.test.ts`) ✅
   - Test line counting accuracy for added/removed lines ✅
   - Verify change categorization (added/modified/deleted) ✅
   - Test diff content extraction for different file types ✅

3. **Error handling tests** (`scripts/__tests__/git-analyzer.test.ts`) ✅
   - Test behavior with non-existent branches ✅
   - Test graceful handling of git command failures ✅
   - Test git repository validation ✅

**Deliverables**: ✅ ALL COMPLETED

- `scripts/types/doc-sync.ts` with `CodeChange` interface definition ✅
- `scripts/lib/git-analyzer.ts` with `GitAnalyzer` class and `getCodeChanges()` method ✅
- Git command utilities with comprehensive error handling ✅
- `scripts/__tests__/git-analyzer.test.ts` with comprehensive test coverage ✅ (25/25 tests passing)
- `scripts/__tests__/fixtures/sample-git-diffs/` with test fixtures ✅

---

## Stage 2: Documentation Mapping System

**Goal**: Establish relationships between documentation files and code files

### Files:

- **Create**: `scripts/lib/doc-mapper.ts` - Documentation mapping logic ✅
- **Modify**: `scripts/types/doc-sync.ts` - Add `DocumentationFile` interface ✅ (already completed in Stage 1)

### Actions:

1. **Implement content-based mapping** (`scripts/lib/doc-mapper.ts`) ✅ COMPLETED
   - Scan documentation for explicit file path references (`src/index.ts`) ✅ (`extractFilePathReferences` implemented & tested)
   - Extract function name references (`` `generatePoem()` ``) ✅ (`extractFunctionNameReferences` implemented & tested)
   - Build mapping table of docs → relevant code files ✅ (`buildMappingTable` implemented & tested)

2. **Add heuristic matching** (`scripts/lib/doc-mapper.ts`)
   - Match documentation filenames to code file patterns
   - Implement directory structure-based mapping
   - Create confidence scoring for mapping relationships

3. **Extend LocalDocsReader integration** (`scripts/lib/doc-mapper.ts`)
   - Enhance `DocumentationFile` interface with `linkedCodeFiles`
   - Integrate with existing `LocalDocsReader` class
   - Cache mapping results for performance

### Tests:

- **Create**: `scripts/__tests__/doc-mapper.test.ts` - Unit tests for documentation mapping ✅
- **Create**: `scripts/__tests__/fixtures/sample-docs/` - Sample documentation files ✅

### Test Specifications:

1. **Content-based mapping tests** (`scripts/__tests__/doc-mapper.test.ts`) ✅ COMPLETED (8/8 tests passing)
   - Test extraction of explicit file path references from markdown ✅ (3/3 tests passing)
   - Test function name reference extraction (`` `generatePoem()` ``) ✅ (3/3 tests passing)
   - Test mapping table creation with various documentation formats ✅ (2/2 tests passing)

2. **Heuristic matching tests** (`scripts/__tests__/doc-mapper.test.ts`)
   - Test filename pattern matching (doc-mapper.md → doc-mapper.ts)
   - Test directory structure-based mapping
   - Test confidence scoring algorithm with different matching scenarios

3. **LocalDocsReader integration tests** (`scripts/__tests__/doc-mapper.test.ts`)
   - Test enhanced `DocumentationFile` interface with `linkedCodeFiles`
   - Test integration with existing `LocalDocsReader` class
   - Test mapping cache performance and invalidation

**Deliverables**: 🔄 IN PROGRESS

- `scripts/types/doc-sync.ts` with enhanced `DocumentationFile` interface ✅
- `scripts/lib/doc-mapper.ts` with `DocMapper` class containing: 🔄 PARTIAL
  - Content scanning functions for file/function references ✅ ALL COMPLETE (`extractFilePathReferences`, `extractFunctionNameReferences`, `buildMappingTable`)
  - Heuristic matching algorithms
  - Integration methods for `LocalDocsReader`
- `scripts/__tests__/doc-mapper.test.ts` with comprehensive mapping tests ✅
- `scripts/__tests__/fixtures/sample-docs/` with test documentation files ✅

---

## Stage 3: LLM Integration & Analysis

**Goal**: Use LLM to determine if documentation needs updating based on code changes

### Files:

- **Create**: `scripts/lib/llm-analyzer.ts` - LLM integration and analysis
- **Modify**: `scripts/lib/config.ts` - Add LLM configuration options
- **Modify**: `scripts/types/doc-sync.ts` - Add LLM-related interfaces

### Actions:

1. **Create LLM service abstraction** (`scripts/lib/llm-analyzer.ts`)
   - Define `LLMProvider` interface supporting OpenAI, Anthropic, local models
   - Implement configuration management for API keys, models, tokens
   - Add retry logic and error handling for API calls

2. **Build analysis prompt system** (`scripts/lib/llm-analyzer.ts`)
   - Design structured prompts for documentation analysis
   - Include documentation content and relevant code diffs
   - Request structured JSON responses with recommendations

3. **Implement response parsing** (`scripts/lib/llm-analyzer.ts`)
   - Parse LLM JSON responses into `SyncRecommendation` objects
   - Handle malformed responses gracefully
   - Categorize recommendations by priority (high/medium/low)

### Tests:

- **Create**: `scripts/__tests__/llm-analyzer.test.ts` - Unit tests for LLM integration
- **Create**: `scripts/__tests__/fixtures/sample-llm-responses/` - Mock LLM responses

### Test Specifications:

1. **LLM service abstraction tests** (`scripts/__tests__/llm-analyzer.test.ts`)
   - Test `LLMProvider` interface implementation for OpenAI, Anthropic
   - Test configuration management and API key validation
   - Test retry logic and API call error handling with network failures

2. **Analysis prompt system tests** (`scripts/__tests__/llm-analyzer.test.ts`)
   - Test structured prompt generation with various documentation/code combinations
   - Test prompt template formatting and content inclusion
   - Test JSON response request structure and validation

3. **Response parsing tests** (`scripts/__tests__/llm-analyzer.test.ts`)
   - Test parsing of valid LLM JSON responses into `SyncRecommendation` objects
   - Test graceful handling of malformed/invalid JSON responses
   - Test priority categorization (high/medium/low) and recommendation validation

**Deliverables**:

- `scripts/lib/config.ts` with LLM configuration options
- `scripts/types/doc-sync.ts` with `LLMProvider`, `SyncRecommendation` interfaces
- `scripts/lib/llm-analyzer.ts` with `LLMAnalyzer` class containing:
  - LLM service abstraction with multiple provider support
  - Structured prompt templates for analysis
  - Response parsing with `SyncRecommendation` output
- `scripts/__tests__/llm-analyzer.test.ts` with comprehensive LLM integration tests
- `scripts/__tests__/fixtures/sample-llm-responses/` with mock API response fixtures

---

## Stage 4: CLI Interface & Reporting

**Goal**: Provide user-friendly CLI interface and actionable output

### Files:

- **Create**: `scripts/analyze-doc-sync.ts` - Main CLI entry point
- **Create**: `scripts/lib/report-generator.ts` - Report formatting logic
- **Modify**: `package.json` - Add npm script

### Actions:

1. **Create main CLI script** (`scripts/analyze-doc-sync.ts`)
   - Implement main CLI with command-line interface
   - Add support for specifying target branch (default: `main`)
   - Integrate with existing TypeScript configuration
   - Orchestrate all previous components (`GitAnalyzer`, `DocMapper`, `LLMAnalyzer`)

2. **Build reporting system** (`scripts/lib/report-generator.ts`)
   - Format recommendations with clear priority indicators
   - Group suggestions by documentation file
   - Include affected code files and specific change suggestions
   - Generate console output with colors and formatting

3. **Add package.json integration** (`package.json`)
   - Create npm script `script:analyze-sync` for easy execution
   - Add development and production usage examples
   - Document CLI options and parameters

### Tests:

- **Create**: `scripts/__tests__/report-generator.test.ts` - Unit tests for report formatting
- **Create**: `scripts/__tests__/analyze-doc-sync.test.ts` - Integration tests for CLI

### Test Specifications:

1. **Main CLI script tests** (`scripts/__tests__/analyze-doc-sync.test.ts`)
   - Test command-line argument parsing and validation
   - Test target branch specification (default: `main`)
   - Test orchestration of all components (`GitAnalyzer`, `DocMapper`, `LLMAnalyzer`)
   - Test end-to-end workflow with mock data

2. **Reporting system tests** (`scripts/__tests__/report-generator.test.ts`)
   - Test recommendation formatting with priority indicators
   - Test grouping by documentation file
   - Test inclusion of affected code files and change suggestions
   - Test console output formatting, colors, and readability

3. **Package.json integration tests** (`scripts/__tests__/analyze-doc-sync.test.ts`)
   - Test npm script execution and parameter passing
   - Test CLI help output and documentation
   - Test error handling for invalid arguments and missing dependencies

**Deliverables**:

- `scripts/analyze-doc-sync.ts` with complete CLI script and argument parsing
- `scripts/lib/report-generator.ts` with `ReportGenerator` class for formatted output
- `package.json` with npm script integration and usage documentation
- `scripts/__tests__/analyze-doc-sync.test.ts` with end-to-end integration tests
- `scripts/__tests__/report-generator.test.ts` with comprehensive report formatting tests

---

## Configuration Requirements

### Environment Variables

```bash
LLM_PROVIDER=openai          # openai | anthropic | local
LLM_API_KEY=your-api-key     # API key for chosen provider
LLM_MODEL=gpt-4              # Model to use
LLM_MAX_TOKENS=2000          # Maximum tokens per request
```

### Dependencies

**Existing (no changes needed)**:

- `scripts/lib/local-docs-reader.ts` - `LocalDocsReader` class
- `scripts/lib/config.ts` - Configuration system (will be extended)
- `tsconfig.scripts.json` - TypeScript configuration

**New packages to install**:

- `openai` - OpenAI API integration
- `@anthropic-ai/sdk` - Anthropic API integration (optional)
- Node.js built-in `child_process` for git commands (already available)

**Testing dependencies**:

- Already available: `vitest` (existing test framework)
- Already available: TypeScript test configuration

---

## Testing Strategy

### Test Structure

```
scripts/__tests__/
├── git-analyzer.test.ts         # Unit tests for git analysis
├── doc-mapper.test.ts           # Unit tests for documentation mapping
├── llm-analyzer.test.ts         # Unit tests for LLM integration
├── report-generator.test.ts     # Unit tests for report formatting
├── analyze-doc-sync.test.ts     # Integration tests for CLI
└── fixtures/
    ├── sample-git-diffs/
    │   ├── added-file.diff      # Git diff for new file
    │   ├── modified-file.diff   # Git diff for changed file
    │   └── deleted-file.diff    # Git diff for removed file
    ├── sample-docs/
    │   ├── api-reference.md     # Documentation with code references
    │   ├── user-guide.md        # Documentation with examples
    │   └── changelog.md         # Documentation with version info
    └── sample-llm-responses/
        ├── needs-update.json    # LLM response indicating updates needed
        ├── no-update.json       # LLM response indicating no updates needed
        └── malformed.json       # Invalid JSON for error handling tests
```

### Test Coverage Goals

- **Unit Tests**: 90%+ coverage for all individual functions and methods
- **Integration Tests**: End-to-end workflow testing with mocked external dependencies
- **Error Handling**: Comprehensive testing of failure scenarios and edge cases
- **Performance**: Basic performance testing for large documentation sets

### Test Execution

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch

# Run specific test file
npm test git-analyzer.test.ts
```

### Mock Strategy

- **Git Commands**: Mock `child_process.execSync` for git operations
- **File System**: Mock file reading operations for consistent test data
- **LLM APIs**: Mock HTTP requests to avoid API costs during testing
- **LocalDocsReader**: Use existing test patterns from current codebase

---

## Usage Examples

### Basic Analysis

```bash
# Analyze current branch against main
npm run script:analyze-sync

# Analyze against specific branch
npm run script:analyze-sync develop
```

### Expected Output

```
🔍 Analyzing documentation sync against main...
📝 Found 3 code changes
📚 Found 5 documentation files

📋 Found 2 documentation sync recommendations:

1. notionDocs/test-code-relevant.md (high priority)
   Reason: New generatePoemLine function needs documentation
   Suggested changes:
   - Add documentation for generatePoemLine() function
   - Update API reference with new parameters
   Affected files: src/index.ts

2. README.md (medium priority)
   Reason: CLI usage examples may be outdated
   Suggested changes:
   - Update example commands
   - Verify installation instructions
   Affected files: src/index.ts, package.json
```

---

## Integration Points

### Git Workflow

- Can be run manually during development
- Integrate into pre-merge CI checks
- Add as git hook for automatic analysis

### Existing Codebase

- Leverages current `LocalDocsReader` infrastructure
- Uses existing TypeScript configuration
- Follows established project patterns and conventions

### Future Enhancements

- Web interface for review workflow
- Automatic documentation updates via LLM
- Integration with Notion API for direct updates
