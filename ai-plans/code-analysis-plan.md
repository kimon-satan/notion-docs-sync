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

---

## Stage 1: Git Integration & Change Detection

**Goal**: Extract and analyze code changes between git branches

### Actions:

1. **Create git diff utilities**
   - Implement `getCodeChanges()` to extract changed files between branches
   - Parse git status and diff output into structured `CodeChange` objects
   - Filter for source code files only (`.ts`, `.js`, etc.)

2. **Build change analysis**
   - Count lines added/removed per file
   - Categorize changes as `added`, `modified`, or `deleted`
   - Extract actual diff content for LLM analysis

3. **Add error handling**
   - Handle cases where branches don't exist
   - Gracefully handle git command failures
   - Validate git repository state

**Deliverables**:

- `CodeChange` interface definition
- `getCodeChanges()` function implementation
- Git command utilities with error handling

---

## Stage 2: Documentation Mapping System

**Goal**: Establish relationships between documentation files and code files

### Actions:

1. **Implement content-based mapping**
   - Scan documentation for explicit file path references (`src/index.ts`)
   - Extract function name references (`` `generatePoem()` ``)
   - Build mapping table of docs → relevant code files

2. **Add heuristic matching**
   - Match documentation filenames to code file patterns
   - Implement directory structure-based mapping
   - Create confidence scoring for mapping relationships

3. **Extend LocalDocsReader integration**
   - Enhance `DocumentationFile` interface with `linkedCodeFiles`
   - Integrate with existing `LocalDocsReader` class
   - Cache mapping results for performance

**Deliverables**:

- `DocumentationFile` interface with mapping
- Content scanning functions for file/function references
- Heuristic matching algorithms

---

## Stage 3: LLM Integration & Analysis

**Goal**: Use LLM to determine if documentation needs updating based on code changes

### Actions:

1. **Create LLM service abstraction**
   - Define `LLMProvider` interface supporting OpenAI, Anthropic, local models
   - Implement configuration management for API keys, models, tokens
   - Add retry logic and error handling for API calls

2. **Build analysis prompt system**
   - Design structured prompts for documentation analysis
   - Include documentation content and relevant code diffs
   - Request structured JSON responses with recommendations

3. **Implement response parsing**
   - Parse LLM JSON responses into `SyncRecommendation` objects
   - Handle malformed responses gracefully
   - Categorize recommendations by priority (high/medium/low)

**Deliverables**:

- LLM service abstraction with multiple provider support
- Structured prompt templates for analysis
- Response parsing with `SyncRecommendation` output

---

## Stage 4: CLI Interface & Reporting

**Goal**: Provide user-friendly CLI interface and actionable output

### Actions:

1. **Create main CLI script**
   - Implement `scripts/analyze-doc-sync.ts` with command-line interface
   - Add support for specifying target branch (default: `main`)
   - Integrate with existing TypeScript configuration

2. **Build reporting system**
   - Format recommendations with clear priority indicators
   - Group suggestions by documentation file
   - Include affected code files and specific change suggestions

3. **Add package.json integration**
   - Create npm script for easy execution
   - Add development and production usage examples
   - Document CLI options and parameters

**Deliverables**:

- Complete CLI script with argument parsing
- Formatted report output with actionable recommendations
- npm script integration and usage documentation

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

- Existing: `LocalDocsReader`, configuration system
- New: LLM SDK (OpenAI/Anthropic), git command utilities

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
