// Windows upload ZIP: root manifests, bundled assets, and a verified portable runtime.
import { readFile, writeFile, mkdir, cp, access } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
if (process.platform !== 'win32') throw new Error('Build this Windows package on Windows.');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const legacy = JSON.parse(await readFile('.codex-plugin/plugin.json', 'utf8'));
if (pkg.version !== legacy.version) throw new Error('Manifest versions differ');
const runtimeVersion = '22.23.5';
const runtimeArchive = `node-v${runtimeVersion}-win-x64.zip`;
const runtimeSha256 = '4a191082e9706866830379d577d2cc8a50c776fcd9436a8d061b063ed0d9a0e3';
const runtimeUrl = `https://nodejs.org/dist/v${runtimeVersion}/${runtimeArchive}`;
const cache = resolve('artifacts/runtime-cache');
await mkdir(cache, { recursive: true });
const download = join(cache, runtimeArchive);
let bytes;
try { bytes = await readFile(download); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const response = await fetch(runtimeUrl, { signal: AbortSignal.timeout(300_000) });
  if (!response.ok) throw new Error(`Runtime download failed: ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
}
if (createHash('sha256').update(bytes).digest('hex') !== runtimeSha256) throw new Error('Node runtime SHA256 mismatch');
await writeFile(download, bytes);
await import('./notices.mjs');
const name = `zhijian-resume-${pkg.version}-doubao-win-x64`;
const stage = resolve('release', name);
const zip = `${stage}.zip`;
for (const path of [stage, zip]) {
  try { await access(path); throw new Error(`Already exists: ${path}; preserve it and use a new version.`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
await mkdir(join(stage, 'runtime'), { recursive: true });
for (const path of ['assets/icon.png', 'assets/icon.svg', 'dist/cli.cjs', 'dist/index.html', 'skills/resume-editor/SKILL.md', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'docs/privacy.md']) {
  await mkdir(dirname(join(stage, path)), { recursive: true });
  await cp(path, join(stage, path));
}
const json = value => JSON.stringify(value, null, 2) + '\n';
const { skills, mcpServers, interface: listing, ...portable } = legacy;
await writeFile(join(stage, 'plugin.json'), json({
  $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json', ...portable,
  extensions: { 'com.openai': { requires_local_executor: true, interface: listing } },
}));
await writeFile(join(stage, 'mcp.json'), json({
  $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
  mcpServers: { 'zhijian-resume-desktop': { type: 'stdio', command: 'powershell.exe', args: ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', await readFile('scripts/doubao-launcher.ps1', 'utf8')] } },
}));
await writeFile(join(stage, 'runtime/source.json'), json({ version: runtimeVersion, platform: 'win32-x64', url: runtimeUrl, sha256: runtimeSha256, checksums: `https://nodejs.org/dist/v${runtimeVersion}/SHASUMS256.txt` }));
await writeFile(join(stage, 'README.md'), '# 智简简历 · 豆包 Windows 插件\n\n在豆包电脑版：插件 → 添加 → 上传插件，直接选择本 ZIP（无需解压）。新建本地电脑任务，复制发送：请用智简简历创建一份虚构的中文求职简历，并打开内嵌编辑器，让我修改内容、切换模板、调整行间距并导出分页 PDF。\n\n包含 Windows x64 便携 Node.js，无需另装 Node、npm 或填写路径。PDF 导出使用本机 Edge / Chrome。无需公网服务或 ngrok；豆包本身仍可能需要联网。\n\n草稿保存在 %LOCALAPPDATA%/ZhijianResume/drafts。编辑器代码采用 Apache-2.0；附带 Node.js 的许可见 runtime/LICENSE，其他组件见 THIRD_PARTY_NOTICES.md。\n');
// Pass paths via environment variables, never interpolate them into PowerShell code.
execFileSync('powershell.exe', ['-NoProfile', '-Command', `
  $ErrorActionPreference = 'Stop'
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [IO.Compression.ZipFile]::OpenRead($env:ZJ_RUNTIME_ZIP)
  try {
    foreach ($file in @('node.exe', 'LICENSE')) {
      $entry = $archive.GetEntry('node-v' + $env:ZJ_RUNTIME_VERSION + '-win-x64/' + $file)
      if ($null -eq $entry) { throw ('Missing runtime file: ' + $file) }
      [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path $env:ZJ_STAGE ('runtime/' + $file)))
    }
  } finally { $archive.Dispose() }
  [IO.Compression.ZipFile]::CreateFromDirectory($env:ZJ_STAGE, $env:ZJ_OUTPUT)
`], { env: { ...process.env, ZJ_RUNTIME_ZIP: download, ZJ_RUNTIME_VERSION: runtimeVersion, ZJ_STAGE: stage, ZJ_OUTPUT: zip }, stdio: 'inherit' });
const archive = await readFile(zip);
await writeFile(`${zip}.sha256`, `${createHash('sha256').update(archive).digest('hex')}  ${name}.zip\n`);
console.log(`Doubao upload ZIP: ${zip} (${archive.length} bytes)`);
