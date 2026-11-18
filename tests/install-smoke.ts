import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, writeFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { DEMO_RESUME } from '../shared';

assert.equal(process.platform, 'win32', 'Windows installer test requires Windows');
const root = resolve('.');
await mkdir('artifacts', { recursive: true });
const workspace = await mkdtemp(resolve('artifacts/install-'));
const fixture = join(workspace, '下载 Source With Spaces');
const installRoot = join(workspace, '用户 Installed With Spaces');
const mockBin = join(workspace, 'mock-bin');
await mkdir(fixture); await mkdir(mockBin);
for (const name of ['dist', 'docs', 'scripts/install.ps1', 'skills', '.codex-plugin', 'assets', 'README.md', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md']) {
  await mkdir(join(fixture, name, '..'), { recursive: true });
  await cp(join(root, name), join(fixture, name), { recursive: true });
}
// The binary release has no npm scripts: installation must not require npm ci.
await writeFile(join(fixture, 'package.json'), JSON.stringify({ version: JSON.parse(await readFile('package.json', 'utf8')).version, description: '智简简历：本地编辑。' }));
const powershell = join(process.env.SystemRoot!, 'System32/WindowsPowerShell/v1.0/powershell.exe');
const calls = join(workspace, 'codex-calls.jsonl');
await writeFile(join(mockBin, 'codex.cmd'), `@echo off\r\n"${process.execPath}" "%~dp0codex-mock.cjs" %*\r\n`);
await writeFile(join(mockBin, 'codex-mock.cjs'), `require('fs').appendFileSync(process.env.INSTALL_TEST_CALLS,JSON.stringify(process.argv.slice(2))+'\\n');process.exit(Number(process.env.INSTALL_TEST_FAIL||0));`);
const env = { ...process.env, PATH: `${mockBin};${process.env.PATH}`, INSTALL_TEST_CALLS: calls };
function install(args: string[], fail = false) {
  const result = spawnSync(powershell, ['-NoProfile', '-File', join(fixture, 'scripts/install.ps1'), '-InstallRoot', installRoot, ...args], { cwd: workspace, env: { ...env, INSTALL_TEST_FAIL: fail ? '7' : '0' }, encoding: 'utf8' });
  assert.equal(result.status, fail ? 1 : 0, result.stdout + result.stderr);
}
install(['-CheckOnly']);
install(['-Target', 'Local']);
await assert.rejects(access(calls), 'Local install must not invoke Codex');
const first = JSON.parse(await readFile(join(installRoot, 'installation.json'), 'utf8'));
const config = JSON.parse(await readFile(join(installRoot, 'mcp-config.json'), 'utf8'));
const server = config.mcpServers['zhijian-resume'];
assert.equal(server.command.toLowerCase(), process.execPath.toLowerCase());
assert.ok(server.args[0].startsWith(installRoot));
await access(server.args[0]);
await assert.rejects(access(join(first.runtime, 'node_modules')));
const drafts = join(workspace, 'isolated-drafts');
const client = new Client({ name: 'installed-runtime-test', version: '1' });
try {
  await client.connect(new StdioClientTransport({ ...server, cwd: workspace, env: { ...process.env as Record<string, string>, ...server.env, RESUME_DATA_DIR: drafts } }));
  const created = await client.callTool({ name: 'create_resume', arguments: { resume: DEMO_RESUME } });
  assert.ok(!created.isError);
  assert.ok((await client.listResources()).resources.some(r => r.uri.startsWith('ui://')));
} finally { await client.close(); }
await writeFile(join(drafts, 'keep.txt'), 'preserve drafts');
install(['-Target', 'Both']);
const second = JSON.parse(await readFile(join(installRoot, 'installation.json'), 'utf8'));
assert.notEqual(first.runtime, second.runtime);
await access(first.runtime);
assert.equal(await readFile(join(drafts, 'keep.txt'), 'utf8'), 'preserve drafts');
const log = (await readFile(calls, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
assert.deepEqual(log, [['plugin', '--help'], ['plugin', 'marketplace', 'add', installRoot], ['plugin', 'add', 'zhijian-resume@zhijian-local']]);
install(['-Target', 'ChatGPT'], true);
assert.equal(JSON.parse(await readFile(join(installRoot, 'installation.json'), 'utf8')).runtime, second.runtime, 'Preflight failure must not mutate install');
await writeFile(join(workspace, 'result.json'), JSON.stringify({ passed: true, checks: ['PowerShell 5.1', 'Chinese/spaced paths', 'release install without npm', 'installed STDIO outside source cwd', 'version isolation', 'draft preservation', 'ChatGPT CLI argument contract (mock)', 'nonzero error propagation'] }, null, 2));
console.log('PASS: Windows installer, installed STDIO, version isolation, ChatGPT CLI mock and failure handling');
