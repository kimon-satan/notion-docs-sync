/* eslint-disable no-console */
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

import { getDefaultConfig } from '@/src/lib/config';

const CONFIG_FILENAME = '.notion-doc-sync.json';

export function initCommand(): void {
  const configPath = join(process.cwd(), CONFIG_FILENAME);

  if (existsSync(configPath)) {
    console.log(`Config file already exists: ${configPath}`);
    console.log('Remove it first if you want to reinitialize.');
    return;
  }

  const defaultConfig = getDefaultConfig();
  writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2) + '\n', 'utf-8');

  console.log(`Created config file: ${configPath}`);
  console.log('Edit the file to add your Notion API key and database ID.');
}
