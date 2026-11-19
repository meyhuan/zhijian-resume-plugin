import { cp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { basename, dirname, resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const platform = process.argv[2] ?? 'windows';
if (!['windows', 'macos'].includes(platform)) throw new Error(`Unknown release platform: ${platform}`);
const manifest = JSON.parse(await readFile('.codex-plugin/plugin.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
if (manifest.version !== pkg.version) throw new Error('Plugin and package versions differ');
await import('./notices.mjs');
const target = resolve(`release/zhijian-resume-${pkg.version}-${platform}`);
try { await access(target); throw new Error(`Release directory already exists: ${target}. Use a new version or move the old build aside.`); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (platform === 'macos') {
  for (const output of [`${target}.zip`, `${target}.zip.sha256`]) {
    try { await access(output); throw new Error(`Release file already exists: ${output}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
const payload = platform === 'macos' ? join(target, 'plugin') : target;
await mkdir(payload, { recursive: true });
// Explicit allowlist: never copy the workspace, drafts, secrets or node_modules.
const platformFiles = platform === 'macos'
  ? ['scripts/macos-launcher.sh']
  : ['.mcp.json', 'install.cmd', 'scripts/install.ps1'];
for (const name of ['dist/cli.cjs', 'dist/index.html', '.codex-plugin/plugin.json', 'skills/resume-editor/SKILL.md', 'assets', 'README.md', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'TEST-REPORT.md', 'third-party/README.md', 'docs', ...platformFiles]) {
  await mkdir(dirname(join(payload, name)), { recursive: true });
  await cp(resolve(name), join(payload, name), { recursive: true });
}
await writeFile(join(payload, 'package.json'), JSON.stringify({ name: pkg.name, version: pkg.version, private: true, license: pkg.license, engines: pkg.engines }, null, 2));
if (platform === 'macos') {
  const marketplace = JSON.parse(await readFile('.agents/plugins/marketplace.json', 'utf8'));
  const entry = marketplace.plugins.find(plugin => plugin.name === manifest.name);
  if (!entry) throw new Error(`Missing marketplace entry: ${manifest.name}`);
  entry.source.path = './plugin';
  await mkdir(join(target, '.agents/plugins'), { recursive: true });
  await writeFile(join(target, '.agents/plugins/marketplace.json'), JSON.stringify(marketplace, null, 2) + '\n');
  const config = { mcpServers: { 'zhijian-resume': {
    command: '/bin/sh',
    args: ['./scripts/macos-launcher.sh'],
    cwd: '.',
    env_vars: ['CODEX_MCP_NODE_PATH', 'PATH', 'HOME', 'CHROME_PATH', 'RESUME_DATA_DIR'],
  } } };
  await writeFile(join(payload, '.mcp.json'), JSON.stringify(config, null, 2) + '\n');
  const zip = `${target}.zip`;
  execFileSync('tar', ['-a', '-cf', zip, '-C', dirname(target), basename(target)], { stdio: 'inherit' });
  const checksum = createHash('sha256').update(await readFile(zip)).digest('hex');
  await writeFile(`${zip}.sha256`, `${checksum}  ${basename(zip)}\n`);
  console.log(`macOS release: ${zip}`);
} else {
  console.log(`Windows release: ${target}`);
}
