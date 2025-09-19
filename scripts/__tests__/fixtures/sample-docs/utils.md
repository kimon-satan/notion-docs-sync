# Utility Functions

This document covers the various utility functions available throughout the application.

## String Utilities

### Text Processing

The application includes several text processing utilities:

- `capitalizeWords()` - Capitalizes the first letter of each word
- `trimWhitespace()` - Removes excessive whitespace
- `normalizeText()` - Standardizes text format

These functions are implemented in `src/utils/string-helpers.ts`.

## File Operations

### File Management

File operations are handled by utilities in `lib/file-operations.js`:

- `readFileAsync()` - Asynchronously reads file content
- `writeFileAsync()` - Writes content to file
- `ensureDirectoryExists()` - Creates directories as needed

### Path Utilities

Path manipulation functions in `src/utils/path-helpers.ts`:

```typescript
import { joinPath, resolvePath } from './src/utils/path-helpers.ts';

const fullPath = joinPath(basePath, relativePath);
```

## Data Validation

Validation utilities ensure data integrity:

- Input validation in `src/validators/input.ts`
- Schema validation in `src/validators/schema.ts`
- Type checking utilities in `lib/type-guards.js`

## Configuration

Utility configuration is managed through:

- `config/utils.json` - General utility settings
- `config/validation-rules.json` - Validation rule definitions
