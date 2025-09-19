# Generator Component

This document describes the poem generator component and its related functionality.

## Overview

The generator component is the heart of our application, responsible for creating personalized poems based on user input.

## Implementation

The main generator logic is located in `src/components/Generator.tsx` and uses several helper modules:

### Core Generator

```typescript
// File: src/generator.ts
export class PoemGenerator {
  generatePoem(options: PoemOptions): string {
    // Implementation details...
  }
}
```

### Related Files

- `src/types/poem.ts` - Type definitions for poem structures
- `src/utils/text-processing.ts` - Text manipulation utilities
- `tests/generator.test.ts` - Unit tests for the generator

## Usage Examples

```typescript
import { PoemGenerator } from 'src/generator.ts';

const generator = new PoemGenerator();
const result = generator.generatePoem({
  theme: 'love',
  style: 'sonnet',
});
```

## Configuration

Generator configuration is handled through `config/generator.json`.
