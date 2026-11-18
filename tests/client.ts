import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'node:path';
export async function connectClient(directory: string) {
  const client = new Client({ name: 'desktop-test', version: '1' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [resolve('dist/cli.cjs')], env: { ...process.env as Record<string,string>, RESUME_DATA_DIR: directory }, stderr: 'pipe' }));
  return client;
}
