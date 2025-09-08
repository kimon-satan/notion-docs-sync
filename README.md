# NotionDocFetcher

A prototype project for keeping Notion documentation aligned with code changes in a codebase.

## Prerequisites

- Node.js 22.x (use nvm to automatically switch to the correct version)
- npm or yarn

## Setup

1. **Use the correct Node.js version:**

   ```bash
   nvm use
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys and configuration
   ```

4. **Set up git hooks:**
   ```bash
   npm run prepare
   ```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project for production
- `npm start` - Start the production build
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build directory

### Project Structure

```
src/
├── api/                # API integration layer
│   ├── notion/         # Notion API client
│   └── github/         # GitHub API client
├── core/               # Core business logic
│   ├── sync/           # Synchronization engine
│   ├── parser/         # Code parsing utilities
│   └── matcher/        # Doc-code matching logic
├── models/             # Data models and types
├── utils/              # Pure utility functions
├── config/             # Configuration management
└── __tests__/          # Test files mirror src structure
```

### Development Rules

This project follows strict development rules outlined in `RULES.md`:

- **Test-Driven Development (TDD)** - Always write tests first
- **Single Responsibility Principle** - One file, one responsibility
- **90% code coverage minimum**
- **TypeScript strict mode**
- **No `any` types allowed**

## Testing

Tests are written using Vitest and follow the AAA pattern (Arrange, Act, Assert).

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Environment Variables

Required environment variables (see `.env.example`):

- `NODE_ENV` - Environment (development/production/test)
- `PORT` - Application port
- `NOTION_API_KEY` - Your Notion integration API key
- `NOTION_DATABASE_ID` - Target Notion database ID
- `GITHUB_TOKEN` - GitHub personal access token
- `GITHUB_OWNER` - GitHub username or organization
- `GITHUB_REPO` - Repository name

## API Keys Setup

### Notion API

1. Go to [Notion Developers](https://developers.notion.com/)
2. Create a new integration
3. Copy the API key to your `.env` file
4. Share your database with the integration

### GitHub API

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token with repo permissions
3. Copy the token to your `.env` file

## Contributing

1. Follow the development rules in `RULES.md`
2. Write tests first (TDD)
3. Ensure all tests pass and coverage is above 90%
4. Run linting and formatting before committing
5. Use conventional commit messages

## License

MIT
