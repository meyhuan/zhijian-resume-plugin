import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { DEMO_RESUME, type EditorSession } from '../shared';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const zip = resolve(`release/zhijian-resume-${pkg.version}-doubao-win-x64.zip`);
await mkdir('artifacts', { recursive: true });
const workspace = await mkdtemp(resolve('artifacts/doubao-zip-'));
const localAppData = join(workspace, '中文 Installed With Spaces');
const installed = join(localAppData, 'Doubao/User Data/Default/.doubao/agent_mode/workspace/plugins/test-plugin');
const powershell = join(process.env.SystemRoot!, 'System32/WindowsPowerShell/v1.0/powershell.exe');
execFileSync(powershell, ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory($env:ZJ_ZIP, $env:ZJ_EXTRACT)'], { env: { ...process.env, ZJ_ZIP: zip, ZJ_EXTRACT: installed } });
const manifest = JSON.parse(await readFile(join(installed, 'plugin.json'), 'utf8'));
assert.equal(manifest.version, pkg.version);
const mcp = JSON.parse(await readFile(join(installed, 'mcp.json'), 'utf8')).mcpServers['zhijian-resume-desktop'];
// Only Windows system commands remain in PATH. No global Node or npm is available.
const env = { ...process.env as Record<string, string>, SystemRoot: process.env.SystemRoot!, PATH: join(process.env.SystemRoot!, 'System32/WindowsPowerShell/v1.0'), LOCALAPPDATA: localAppData, USERPROFILE: process.env.USERPROFILE!, TEMP: process.env.TEMP!, RESUME_DATA_DIR: join(workspace, 'drafts') };
const runtime = execFileSync(join(installed, 'runtime/node.exe'), ['--version'], { env, encoding: 'utf8' }).trim();
assert.equal(runtime, 'v22.23.5');
const client = new Client({ name: 'doubao-zip-smoke', version: '1' });
try {
  console.log('ZIP smoke: connecting bundled runtime');
  await client.connect(new StdioClientTransport({ command: mcp.command, args: mcp.args, cwd: workspace, env, stderr: 'inherit' }));
  console.log('ZIP smoke: connected');
  const resources = await client.listResources();
  const html = await client.readResource({ uri: resources.resources[0].uri });
  assert.ok('text' in html.contents[0] && html.contents[0].text.length > 100_000);
  const resume = structuredClone(DEMO_RESUME);
  const block = resume.sections[0].blocks[0];
  if ('contentHtml' in block) block.contentHtml = Array.from({ length: 80 }, (_, i) => `<p>ZIPROW${i + 1}END 本地安装测试，协调团队完成产品设计、需求评审和项目验收。</p>`).join('');
  console.log('ZIP smoke: creating document');
  const created = await client.callTool({ name: 'create_resume', arguments: { resume } });
  const session = created._meta?.session as EditorSession;
  assert.ok(session?.id);
  session.document.resume.name = 'ZIP 编辑验证（虚构）';
  session.document.template = 'elegant';
  const saved = await client.callTool({ name: 'save_resume', arguments: { id: session.id, accessKey: session.accessKey, expectedRevision: 1, documentJson: JSON.stringify(session.document) } });
  assert.ok(!saved.isError, JSON.stringify(saved.content));
  console.log('ZIP smoke: saved; exporting PDF');
  const result = await client.callTool({ name: 'export_resume_pdf', arguments: { id: session.id, accessKey: session.accessKey, revision: 2 } });
  assert.ok(!result.isError, JSON.stringify(result.content));
  const data = new Uint8Array(Buffer.from((result._meta!.result as { base64: string }).base64, 'base64'));
  await writeFile('artifacts/doubao-zip-smoke.pdf', data);
  console.log('ZIP smoke: exported; checking PDF');
  const loadingTask = getDocument({ data: data.slice(), useSystemFonts: true });
  const pdf = await loadingTask.promise;
  assert.ok(pdf.numPages > 1);
  let text = '';
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    assert.ok(Math.abs(page.view[2] - 595.28) < 2 && Math.abs(page.view[3] - 841.89) < 2);
    const pageText = (await page.getTextContent()).items.map(i => 'str' in i ? i.str : '').join('');
    assert.ok(pageText.trim()); text += pageText;
  }
  for (let n = 1; n <= 80; n++) assert.ok(text.includes(`ZIPROW${n}END`));
  assert.ok(text.includes('ZIP 编辑验证'));
  const report = { runtime, installed, globalNodeRequired: false, pages: pdf.numPages, rows: 80, saveRevision: 2, passed: true };
  await writeFile('artifacts/doubao-zip-smoke.json', JSON.stringify(report, null, 2));
  console.log(report);
  await loadingTask.destroy();
} finally { await client.close(); }
