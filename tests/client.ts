import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, type StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'node:path';
export async function connectClient(directory: string, server: StdioServerParameters = { command: process.execPath, args: [resolve('dist/cli.cjs')] }) {
  const client = new Client({ name: 'desktop-test', version: '1' });
  await client.connect(new StdioClientTransport({ ...server, env: { ...process.env as Record<string,string>, RESUME_DATA_DIR: directory }, stderr: 'pipe' }));
  return client;
}
