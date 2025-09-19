# API Documentation

This document describes the main API functions available in our application.

## Core Functions

### generatePoem()

The `generatePoem()` function is implemented in `src/generator.ts` and provides the main functionality for creating poems.

```typescript
import { generatePoem } from './src/generator.ts';

const poem = generatePoem({
  theme: 'nature',
  length: 'short',
});
```

### validateInput()

The `validateInput()` function ensures that user input meets our requirements. See `src/validation.ts` for implementation details.

## Utility Functions

Additional helper functions are available:

- `formatOutput()` - formats the generated content
- `saveToFile()` - saves poems to disk
- `loadTemplate()` - loads poem templates

These are implemented across multiple files:

- `lib/formatters.js`
- `lib/file-utils.js`
- `templates/template-loader.ts`
