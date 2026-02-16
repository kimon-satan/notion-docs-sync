# notion-doc-sync

A CLI tool that keeps Notion documentation aligned with code changes. It fetches Notion pages as local Markdown, detects git changes, maps them to relevant docs, and supports bidirectional sync between local files and Notion.

## Prerequisites

- Node.js >= 18.0.0 (22.x recommended — use `nvm use` to auto-switch)
- npm
- A [Notion integration](https://developers.notion.com/) with access to your documentation pages

## Quick Start

```bash
# Install globally from npm
npm install -g notion-doc-sync

# Initialise config in your project
notion-doc-sync init

# Edit .notion-doc-sync.json with your Notion API key and database ID

# Fetch docs from Notion
notion-doc-sync fetch
```

## CLI Commands

### `notion-doc-sync init`

Creates a `.notion-doc-sync.json` config file in the current directory with default settings. Edit this file to add your Notion API key and database ID.

### `notion-doc-sync fetch`

Fetches documentation pages from Notion and saves/updates them as local Markdown files in the configured docs directory (default: `./notionDocs`). Pages are matched by the page IDs stored in each local file's frontmatter.

### `notion-doc-sync analyze`

Analyses git changes between two branches and maps them to documentation files using heuristic matching with confidence scores.

```bash
notion-doc-sync analyze                              # compare main..HEAD
notion-doc-sync analyze --base-branch develop        # custom base branch
notion-doc-sync analyze --target-branch feature/foo  # custom target branch
```

### `notion-doc-sync sync`

Bidirectional sync between local docs and Notion. Compares timestamps to determine whether each file should be pulled from Notion or pushed to Notion.

```bash
notion-doc-sync sync            # execute sync
notion-doc-sync sync --dry-run  # preview actions without making changes
```

### `notion-doc-sync stamp`

Updates the `lastUpdated` timestamp in the frontmatter of any locally modified Markdown files (detected via `git status`). Useful before pushing changes to Notion.

## Configuration

Configuration is read from `.notion-doc-sync.json` in the project root. Run `notion-doc-sync init` to generate one.

```json
{
  "notionApiKey": "",
  "notionDatabaseId": "",
  "sourceDir": "./src",
  "docsDir": "./notionDocs",
  "excludePatterns": [
    "node_modules/**",
    "dist/**",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/__tests__/**",
    ".git/**"
  ]
}
```

| Field              | Description                            | Default        |
| ------------------ | -------------------------------------- | -------------- |
| `notionApiKey`     | Notion integration API key             | —              |
| `notionDatabaseId` | Target Notion database ID              | —              |
| `sourceDir`        | Source code directory to analyse       | `./src`        |
| `docsDir`          | Local docs directory                   | `./notionDocs` |
| `excludePatterns`  | Glob patterns to exclude from analysis | See above      |

### Setting up Notion

1. Go to [Notion Developers](https://developers.notion.com/) and create a new integration.
2. Copy the integration token into `notionApiKey` in your config file.
3. Share your documentation database/pages with the integration.
4. Copy the database ID into `notionDatabaseId`.

## Repository Structure

```
src/
├── cli.ts                          # CLI entry point (commander)
├── commands/
│   ├── fetch.ts                    # fetch command
│   ├── analyze.ts                  # analyze command
│   ├── init.ts                     # init command
│   ├── sync.ts                     # sync command
│   └── stamp.ts                    # stamp command
├── lib/
│   ├── config.ts                   # Config loading and validation
│   ├── notion-client.ts            # Notion API wrapper
│   ├── local-docs-reader.ts        # Local Markdown file reader/writer
│   ├── doc-mapper.ts               # Doc-to-code mapping with confidence scores
│   ├── git-analyzer.ts             # Git diff extraction between branches
│   ├── md-to-notion-converter.ts   # Markdown to Notion block converter
│   ├── notion-md-converter.ts      # Notion to Markdown converter
│   └── timestamp-utils.ts          # Timestamp comparison utilities
├── types/
│   └── doc-sync.ts                 # TypeScript interfaces and types
└── __tests__/                      # Tests (mirrors src structure)
```

## Local Development

```bash
# Clone the repo
git clone <repo-url>
cd NotionDocFetcher

# Use the correct Node version
nvm use

# Install dependencies
npm install

# Run in development mode (via ts-node)
npm run dev -- fetch
npm run dev -- analyze --base-branch main
npm run dev -- sync --dry-run

# Build
npm run build

# Run the built CLI
node dist/cli.js fetch
```

### Available Scripts

| Script                  | Description                                |
| ----------------------- | ------------------------------------------ |
| `npm run build`         | Compile TypeScript to `dist/`              |
| `npm run dev`           | Run via ts-node (pass CLI args after `--`) |
| `npm test`              | Run all tests once                         |
| `npm run test:watch`    | Run tests in watch mode                    |
| `npm run test:coverage` | Coverage report (90% threshold enforced)   |
| `npm run lint`          | ESLint                                     |
| `npm run lint:fix`      | Auto-fix lint issues                       |
| `npm run format`        | Prettier formatting                        |
| `npm run type-check`    | TypeScript type check without emit         |
| `npm run clean`         | Remove `dist/`                             |

### Running a Single Test File

```bash
npx vitest run src/__tests__/doc-mapper.test.ts
```

## Deployment

### Publishing to npm

The package is configured for npm publishing with the binary name `notion-doc-sync`.

```bash
# Build, test, and publish (prepublishOnly runs automatically)
npm publish

# Or step by step:
npm run clean
npm run build
npm test
npm publish
```

The published package includes only the compiled JavaScript (`dist/`), type declarations, README, and LICENSE.

### Installing from npm

Once published, users install it globally:

```bash
npm install -g notion-doc-sync
notion-doc-sync --help
```

Or use it as a project-local dev dependency:

```bash
npm install --save-dev notion-doc-sync
npx notion-doc-sync fetch
```

## License

MIT
