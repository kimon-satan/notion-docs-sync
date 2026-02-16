import type { SyncDirection } from '../types/doc-sync';

const TIMESTAMP_REGEX = /\*Last updated:\s*(.+?)\*/;

export function parseTimestamp(content: string): Date | null {
  const match = content.match(TIMESTAMP_REGEX);
  if (match?.[1] === undefined || match[1] === '') {
    return null;
  }

  const raw = match[1].trim();
  const date = new Date(raw);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function formatTimestamp(date: Date): string {
  return date.toISOString();
}

export function buildTimestampLine(date: Date): string {
  return `*Last updated: ${formatTimestamp(date)}*`;
}

export function replaceTimestampInContent(content: string, newDate: Date): string {
  if (!TIMESTAMP_REGEX.test(content)) {
    return content;
  }

  return content.replace(TIMESTAMP_REGEX, buildTimestampLine(newDate));
}

export function compareSyncTimestamps(local: Date | null, notion: Date): SyncDirection {
  if (local === null) {
    return 'pull';
  }

  const localSeconds = Math.floor(local.getTime() / 1000);
  const notionSeconds = Math.floor(notion.getTime() / 1000);

  if (notionSeconds > localSeconds) {
    return 'pull';
  }

  if (localSeconds > notionSeconds) {
    return 'push';
  }

  return 'none';
}
