import { describe, it, expect } from 'vitest';
import {
  parseTimestamp,
  formatTimestamp,
  buildTimestampLine,
  replaceTimestampInContent,
  compareSyncTimestamps,
} from '../lib/timestamp-utils';

describe('timestamp-utils', () => {
  describe('parseTimestamp', () => {
    it('should parse ISO 8601 timestamp from content', () => {
      const content = '*Last updated: 2026-02-16T14:30:00.000Z*';
      const result = parseTimestamp(content);

      expect(result).toEqual(new Date('2026-02-16T14:30:00.000Z'));
    });

    it('should parse legacy YYYY-MM-DD timestamp from content', () => {
      const content = '*Last updated: 2025-09-08*';
      const result = parseTimestamp(content);

      expect(result).toEqual(new Date('2025-09-08'));
    });

    it('should return null when no timestamp is found', () => {
      const content = '# Title\n\nSome body content';
      const result = parseTimestamp(content);

      expect(result).toBeNull();
    });

    it('should return null for invalid date string', () => {
      const content = '*Last updated: not-a-date*';
      const result = parseTimestamp(content);

      expect(result).toBeNull();
    });

    it('should parse timestamp embedded in larger content', () => {
      const content = [
        'pageId=abc123',
        '',
        '# My Doc',
        '',
        '*Last updated: 2026-01-15T10:00:00.000Z*',
        '',
        'Body content here',
      ].join('\n');
      const result = parseTimestamp(content);

      expect(result).toEqual(new Date('2026-01-15T10:00:00.000Z'));
    });
  });

  describe('formatTimestamp', () => {
    it('should format a date as ISO 8601 string', () => {
      const date = new Date('2026-02-16T14:30:00.000Z');
      const result = formatTimestamp(date);

      expect(result).toBe('2026-02-16T14:30:00.000Z');
    });
  });

  describe('buildTimestampLine', () => {
    it('should build a formatted timestamp line', () => {
      const date = new Date('2026-02-16T14:30:00.000Z');
      const result = buildTimestampLine(date);

      expect(result).toBe('*Last updated: 2026-02-16T14:30:00.000Z*');
    });
  });

  describe('replaceTimestampInContent', () => {
    it('should replace existing timestamp with new one', () => {
      const content = [
        'pageId=abc123',
        '',
        '# Title',
        '',
        '*Last updated: 2025-09-08*',
        '',
        'Body',
      ].join('\n');
      const newDate = new Date('2026-02-16T14:30:00.000Z');

      const result = replaceTimestampInContent(content, newDate);

      expect(result).toContain('*Last updated: 2026-02-16T14:30:00.000Z*');
      expect(result).not.toContain('2025-09-08');
    });

    it('should return content unchanged if no timestamp found', () => {
      const content = '# Title\n\nBody';
      const newDate = new Date('2026-02-16T14:30:00.000Z');

      const result = replaceTimestampInContent(content, newDate);

      expect(result).toBe(content);
    });

    it('should replace ISO 8601 timestamp', () => {
      const content = '*Last updated: 2026-01-01T00:00:00.000Z*';
      const newDate = new Date('2026-02-16T14:30:00.000Z');

      const result = replaceTimestampInContent(content, newDate);

      expect(result).toBe('*Last updated: 2026-02-16T14:30:00.000Z*');
    });
  });

  describe('compareSyncTimestamps', () => {
    it('should return pull when local is null', () => {
      const notion = new Date('2026-02-16T14:30:00.000Z');

      expect(compareSyncTimestamps(null, notion)).toBe('pull');
    });

    it('should return pull when notion is newer', () => {
      const local = new Date('2026-02-16T14:00:00.000Z');
      const notion = new Date('2026-02-16T14:30:00.000Z');

      expect(compareSyncTimestamps(local, notion)).toBe('pull');
    });

    it('should return push when local is newer', () => {
      const local = new Date('2026-02-16T15:00:00.000Z');
      const notion = new Date('2026-02-16T14:30:00.000Z');

      expect(compareSyncTimestamps(local, notion)).toBe('push');
    });

    it('should return none when timestamps are equal', () => {
      const local = new Date('2026-02-16T14:30:00.000Z');
      const notion = new Date('2026-02-16T14:30:00.000Z');

      expect(compareSyncTimestamps(local, notion)).toBe('none');
    });

    it('should truncate to seconds for comparison', () => {
      const local = new Date('2026-02-16T14:30:00.100Z');
      const notion = new Date('2026-02-16T14:30:00.900Z');

      expect(compareSyncTimestamps(local, notion)).toBe('none');
    });
  });
});
