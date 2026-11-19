import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { connectClient } from './client';
import { basename, join, resolve } from 'node:path';

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { DEMO_RESUME, type EditorSession } from '../shared';

await mkdir('artifacts', { recursive: true });
const client = await (process.argv.includes('--macos-package')
  ? connectMacPackage()
  : connectClient(resolve('artifacts/test-drafts')));

async function connectMacPackage() {
  const { version } = JSON.parse(await readFile('package.json', 'utf8'));
  const packageName = `zhijian-resume-${version}-macos`;
  const zip = resolve('release', `${packageName}.zip`);
  const checksum = createHash('sha256').update(await readFile(zip)).digest('hex');
  assert.equal((await readFile(`${zip}.sha256`, 'utf8')).trim(), `${checksum}  ${basename(zip)}`);
  const workspace = await mkdtemp(resolve('artifacts', 'macOS 安装-'));
  execFileSync('tar', ['-xf', zip, '-C', workspace]);
  const marketplaceRoot = join(workspace, packageName);
  const marketplace = JSON.parse(await readFile(join(marketplaceRoot, '.agents/plugins/marketplace.json'), 'utf8'));
  assert.equal(marketplace.name, 'zhijian-local');
  assert.equal(marketplace.plugins[0].source.path, './plugin');
  const installed = resolve(marketplaceRoot, marketplace.plugins[0].source.path);
  const plugin = JSON.parse(await readFile(join(installed, '.codex-plugin/plugin.json'), 'utf8'));
  assert.equal(marketplace.plugins[0].name, plugin.name);
  assert.equal(plugin.version, version);
  const { command, args, cwd } = JSON.parse(await readFile(join(installed, plugin.mcpServers), 'utf8')).mcpServers['zhijian-resume'];
  return connectClient(join(workspace, 'drafts'), {
    command: process.env.ZHIJIAN_TEST_POSIX_SHELL ?? command,
    args,
    cwd: resolve(installed, cwd),
  });
}

try {
  for (const long of [false, true]) {
    const resume = structuredClone(DEMO_RESUME);
    const block = resume.sections[0].blocks[0];
    if (long && 'contentHtml' in block) block.contentHtml = Array.from({ length: 100 }, (_, i) => `<p>分页测试第${i + 1}条：负责用户需求分析与产品方案设计，协调研发推进项目交付。标记ROW${i + 1}END</p>`).join('');
    const created = await client.callTool({ name: 'create_resume', arguments: { resume } });
    const session = created._meta?.session as EditorSession;
    const result = await client.callTool({ name: 'export_resume_pdf', arguments: { id: session.id, accessKey: session.accessKey, revision: 1 } });
    assert.ok(!result.isError, JSON.stringify(result.content));
    const output = result._meta?.result as { base64: string };
    const data = new Uint8Array(Buffer.from(output.base64, 'base64'));
    await writeFile(`artifacts/${long ? 'multipage' : 'single-page'}.pdf`, data);
    const loadingTask = getDocument({ data: data.slice(), useSystemFonts: true });
    const pdf = await loadingTask.promise;
    assert.ok(long ? pdf.numPages > 1 : pdf.numPages === 1);
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => 'str' in item ? item.str : '').join('');
      assert.ok(pageText.trim(), `blank page ${i}`);
      text += pageText;
      assert.ok(Math.abs(page.view[2] - 595.28) < 2 && Math.abs(page.view[3] - 841.89) < 2);
    }
    assert.ok(text.includes('林晓'));
    if (long) for (let i = 1; i <= 100; i++) assert.ok(text.includes(`ROW${i}END`), `missing row ${i}`);
    console.log(`${long ? 'multipage' : 'single-page'}: ${pdf.numPages} A4 pages; Chinese text and all content retained`);
    await loadingTask.destroy();
  }
} finally { await client.close(); }
