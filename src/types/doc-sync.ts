/**
 * Type definitions for the documentation sync analyzer
 */

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

/**
 * Direction for bidirectional sync between local and Notion
 */
export type SyncDirection = 'pull' | 'push' | 'none';

/**
 * Describes a sync action to be taken for a single document
 */
export interface SyncAction {
  readonly pageId: string;
  readonly filePath: string;
  readonly fileName: string;
  readonly direction: SyncDirection;
  readonly localTimestamp: Date | null;
  readonly notionTimestamp: Date;
}

/**
 * Result of executing a sync action
 */
export interface SyncResult {
  readonly pageId: string;
  readonly fileName: string;
  readonly direction: SyncDirection;
  readonly success: boolean;
  readonly error?: string;
  readonly synchronizedTimestamp?: Date;
}

/**
 * Full metadata extracted from a local documentation file
 */
export interface LocalDocMetadata {
  readonly pageId: string;
  readonly title: string;
  readonly lastUpdated: Date | null;
  readonly tags: string[];
  readonly bodyContent: string;
  readonly rawContent: string;
  readonly filePath: string;
  readonly fileName: string;
}
