# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NotionDocFetcher is a CLI tool (`notion-doc-sync`) that keeps Notion documentation aligned with code changes. It fetches Notion pages as local Markdown and supports bidirectional sync between local files and Notion.

## Commands

```bash
pnpm run build            # TypeScript compilation to dist/
pnpm run dev              # Development with tsx (src/cli.ts)
pnpm test                 # Run all tests once
pnpm run test:watch       # Watch mode
pnpm run test:coverage    # Coverage report (90% threshold enforced)
pnpm run lint             # ESLint on src/**/*.ts
pnpm run lint:fix         # Auto-fix lint issues
pnpm run format           # Prettier formatting
pnpm run type-check       # TypeScript type checking without emit
```

Run a single test file: `pnpm vitest run src/lib/config.test.ts`

### CLI Usage

```bash
notion-doc-sync fetch     # Fetch docs from Notion, save locally
notion-doc-sync init      # Create .notion-doc-sync.json config
```

## Architecture

All source code lives in `src/`:

- **`src/cli.ts`** — CLI entry point with commander. Registers `fetch`, `init`, `sync`, `stamp` commands.
- **`src/commands/fetch.ts`** — Fetch command: pulls Notion docs and updates local files.
- **`src/commands/init.ts`** — Init command: writes default `.notion-doc-sync.json`.
- **`src/lib/config.ts`** — Configuration with priority chain: CLI flags > env vars > config file > defaults. Exports `resolveConfig()`, `validateConfig()`, `getDefaultConfig()`.
- **`src/lib/notion-client.ts`** — Notion API wrapper. Fetches pages, parses blocks to Markdown, extracts metadata.
- **`src/lib/local-docs-reader.ts`** — Reads/writes markdown files in `notionDocs/`. Extracts page IDs from frontmatter.
- **`src/types/doc-sync.ts`** — All TypeScript interfaces and type definitions.

Tests are co-located with source files (e.g., `src/lib/config.test.ts` next to `src/lib/config.ts`).

## Code Conventions

- **TDD required**: Write tests first, AAA pattern, minimum 90% coverage
- **TypeScript strict mode**: No `any` types (eslint-disable where Notion API types are impractical), explicit return types, readonly preferred
- **Naming**: kebab-case files, PascalCase classes, camelCase functions
- **Formatting**: Prettier — 2-space indent, 100 char lines, single quotes, trailing commas (ES5), semicolons required
- **Functions**: Max 20 lines, pure functions preferred, single responsibility
- **Linting**: Always run `pnpm run lint:fix` after completing work and fix any remaining errors before finishing
- **Git**: Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- **Node.js**: >=18.0.0
