# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NotionDocFetcher is an npm CLI tool (`notion-doc-sync`) that keeps Notion documentation aligned with code changes. It detects code changes between git branches, maps documentation files to relevant source code, and analyzes whether docs need updating. Stages 1-2 (git analysis, doc mapping) are complete; Stages 3-4 (LLM integration, reporting) are planned.

## Commands

```bash
npm run build            # TypeScript compilation to dist/
npm run dev              # Development with ts-node (src/cli.ts)
npm test                 # Run all tests once
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report (90% threshold enforced)
npm run lint             # ESLint on src/**/*.ts
npm run lint:fix         # Auto-fix lint issues
npm run format           # Prettier formatting
npm run type-check       # TypeScript type checking without emit
```

Run a single test file: `npx vitest run src/lib/doc-mapper.test.ts`

### CLI Usage

```bash
notion-doc-sync fetch     # Fetch docs from Notion, save locally
notion-doc-sync analyze   # Analyze git changes, map to docs
notion-doc-sync init      # Create .notion-doc-sync.json config
```

## Architecture

All source code lives in `src/`:

- **`src/cli.ts`** — CLI entry point with commander. Registers `fetch`, `analyze`, `init` commands.
- **`src/commands/fetch.ts`** — Fetch command: pulls Notion docs and updates local files.
- **`src/commands/analyze.ts`** — Analyze command: git diff + doc mapping + confidence report.
- **`src/commands/init.ts`** — Init command: writes default `.notion-doc-sync.json`.
- **`src/lib/config.ts`** — Configuration with priority chain: CLI flags > env vars > config file > defaults. Exports `resolveConfig()`, `validateConfig()`, `getDefaultConfig()`.
- **`src/lib/notion-client.ts`** — Notion API wrapper. Fetches pages, parses blocks to Markdown, extracts metadata.
- **`src/lib/local-docs-reader.ts`** — Reads/writes markdown files in `notionDocs/`. Extracts page IDs from frontmatter.
- **`src/lib/doc-mapper.ts`** — Maps docs to code files via content extraction and heuristic matching. Confidence scores (0.15–0.9).
- **`src/lib/git-analyzer.ts`** — Extracts code changes between git branches via `git diff`.
- **`src/types/doc-sync.ts`** — All TypeScript interfaces and type definitions.

Tests are co-located with source files (e.g., `src/lib/config.test.ts` next to `src/lib/config.ts`).

## Code Conventions

- **TDD required**: Write tests first, AAA pattern, minimum 90% coverage
- **TypeScript strict mode**: No `any` types (eslint-disable where Notion API types are impractical), explicit return types, readonly preferred
- **Naming**: kebab-case files, PascalCase classes, camelCase functions
- **Formatting**: Prettier — 2-space indent, 100 char lines, single quotes, trailing commas (ES5), semicolons required
- **Functions**: Max 20 lines, pure functions preferred, single responsibility
- **Linting**: Always run `npm run lint:fix` after completing work and fix any remaining errors before finishing
- **Git**: Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- **Node.js**: >=18.0.0
