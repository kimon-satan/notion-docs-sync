/**
 * Type definitions for the documentation sync analyzer
 */

/**
 * Represents a code change detected in git diff
 */
export interface CodeChange {
  /** Path to the changed file relative to repository root */
  filePath: string;
  /** Type of change performed on the file */
  changeType: 'added' | 'modified' | 'deleted';
  /** Number of lines added in this change */
  linesAdded: number;
  /** Number of lines removed in this change */
  linesRemoved: number;
  /** The actual diff content for this file */
  diffContent: string;
  /** Whether this is a source code file (vs test/config/etc) */
  isSourceCode: boolean;
}

/**
 * Represents a documentation file and its metadata
 */
export interface DocumentationFile {
  /** Path to the documentation file */
  filePath: string;
  /** Content of the documentation file */
  content: string;
  /** Code files that this documentation is linked to */
  linkedCodeFiles: string[];
  /** Confidence score for the code-to-doc mapping (0-1) */
  mappingConfidence: number;
}

/**
 * Represents an LLM analysis recommendation
 */
export interface SyncRecommendation {
  /** The documentation file that needs updating */
  documentationFile: string;
  /** Priority level of this recommendation */
  priority: 'high' | 'medium' | 'low';
  /** Human-readable reason for the recommendation */
  reason: string;
  /** Specific changes suggested by the LLM */
  suggestedChanges: string[];
  /** Code files that triggered this recommendation */
  affectedCodeFiles: string[];
}

/**
 * Configuration for LLM providers
 */
export interface LLMProvider {
  /** Name of the provider (openai, anthropic, local) */
  name: string;
  /** API key for the provider */
  apiKey?: string;
  /** Model to use for analysis */
  model: string;
  /** Maximum tokens per request */
  maxTokens: number;
  /** Base URL for the API (for local/custom providers) */
  baseUrl?: string;
}
