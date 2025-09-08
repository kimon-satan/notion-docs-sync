# Development Rules

## Overview

This document establishes the development rules and conventions for building the NotionDocFetcher prototype project. These rules ensure code quality, maintainability, and consistency throughout the development process.

## Core Development Principles

### 1. Test-Driven Development (TDD)

- **Always write tests first** before implementing functionality
- Follow the Red-Green-Refactor cycle:
  1. **Red**: Write a failing test
  2. **Green**: Write minimal code to make it pass
  3. **Refactor**: Improve code while keeping tests green
- Minimum 90% code coverage required
- No code merges without corresponding tests

### 2. Single Responsibility Principle (SRP)

- **One file, one responsibility** - each file should have a single, well-defined purpose
- Functions should do one thing and do it well
- Classes should have only one reason to change
- Modules should have a single cohesive purpose

### 3. SOLID Principles

- **S**ingle Responsibility (covered above)
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Derived classes must be substitutable for base classes
- **I**nterface Segregation: Many specific interfaces better than one general
- **D**ependency Inversion: Depend on abstractions, not concretions

## File Organization

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

### File Naming Conventions

- Use kebab-case for files: `notion-client.ts`
- Use PascalCase for classes: `NotionClient`
- Use camelCase for functions and variables: `fetchNotionPage`
- Test files: `notion-client.test.ts`

## Code Quality Rules

### 1. Pure Functions Preferred

- Favor pure functions (no side effects, deterministic)
- Isolate side effects to specific modules
- Make dependencies explicit through function parameters

### 2. Error Handling

- Always handle errors explicitly
- Use Result/Either types instead of throwing exceptions where possible
- Provide meaningful error messages with context

### 3. Type Safety

- Use TypeScript strictly - no `any` types allowed
- Define interfaces for all data structures
- Use generic types for reusable components

### 4. Function Size

- Functions should be max 20 lines
- If longer, break into smaller functions
- Use descriptive function names that explain intent

## Testing Rules

### 1. Test Structure

- Use AAA pattern: Arrange, Act, Assert
- One assertion per test (where possible)
- Descriptive test names: `should_return_error_when_notion_api_is_unavailable`

### 2. Test Types

- **Unit Tests**: Test individual functions/classes in isolation
- **Integration Tests**: Test component interactions
- **End-to-End Tests**: Test complete workflows

### 3. Mocking Strategy

- Mock external dependencies (APIs, file system)
- Use dependency injection to make mocking easier
- Keep mocks simple and focused

## Code Style

### 1. Formatting

- Use Prettier for consistent formatting
- 2-space indentation
- Max line length: 100 characters
- Trailing commas in multi-line structures

### 2. Comments

- Write self-documenting code - prefer clear names over comments
- Use comments for **why**, not **what**
- Document complex algorithms or business rules
- JSDoc for public APIs

### 3. Imports

- Group imports: external libraries, internal modules, relative imports
- Use absolute imports for internal modules
- Avoid circular dependencies

## Git Workflow

### 1. Commit Messages

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`
- Keep first line under 50 characters
- Include context in body if needed

### 2. Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- Feature branches: `feature/notion-api-client`
- Hotfix branches: `hotfix/critical-bug-fix`

### 3. Pull Request Rules

- All tests must pass
- Code coverage must not decrease
- At least one reviewer approval required
- Squash commits when merging

## Performance Guidelines

### 1. Async Operations

- Use `async/await` for asynchronous code
- Avoid blocking operations
- Implement proper timeout handling

### 2. Memory Management

- Clean up resources (close files, cancel requests)
- Avoid memory leaks in long-running processes
- Use streaming for large data sets

### 3. API Usage

- Implement rate limiting for external APIs
- Cache responses when appropriate
- Use batch operations where available

## Security Rules

### 1. API Keys

- Never commit API keys or secrets
- Use environment variables for configuration
- Implement proper secret rotation

### 2. Input Validation

- Validate all inputs at boundaries
- Sanitize data before processing
- Use parameterized queries if applicable

### 3. Error Information

- Don't expose sensitive information in error messages
- Log security events appropriately
- Implement proper audit trails

## Documentation Requirements

### 1. README Files

- Each major module should have a README
- Include purpose, usage, and examples
- Keep documentation current with code changes

### 2. API Documentation

- Document all public interfaces
- Include examples for complex functions
- Use TypeScript types as primary documentation

### 3. Architecture Decisions

- Document significant architectural choices
- Include reasoning and alternatives considered
- Update when decisions change

## Code Review Checklist

### Before Submitting PR

- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] No console.log or debug statements
- [ ] Error handling implemented
- [ ] Documentation updated if needed

### During Review

- [ ] Code follows single responsibility principle
- [ ] Tests adequately cover new functionality
- [ ] No code duplication
- [ ] Performance considerations addressed
- [ ] Security implications considered

## Tooling

### Required Tools

- **TypeScript**: For type safety
- **Vitest**: For testing
- **ESLint**: For code linting
- **Prettier**: For code formatting
- **Husky**: For git hooks

### Recommended Extensions

- TypeScript strict mode
- Import sorting
- Unused import removal
- Auto-formatting on save

---

## Getting Started

1. **Setup**: Install dependencies and configure development environment
2. **Write Test**: Start with a failing test for your feature
3. **Implement**: Write minimal code to pass the test
4. **Refactor**: Improve code quality while keeping tests green
5. **Review**: Self-review against these rules before submitting PR

---

_Last Updated: September 8, 2025_
_Version: 1.0_
