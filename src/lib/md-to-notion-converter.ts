import { markdownToBlocks } from '@tryfabric/martian';
import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';

export class MdToNotionConverter {
  convertToBlocks(markdown: string): BlockObjectRequest[] {
    if (!markdown.trim()) {
      return [];
    }

    return markdownToBlocks(markdown) as BlockObjectRequest[];
  }
}
