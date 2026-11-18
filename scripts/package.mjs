import { cp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const manifest = JSON.parse(await readFile('.codex-plugin/plugin.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
if (manifest.version !== pkg.version) throw new Error('Plugin and package versions differ');
await import('./notices.mjs');
const target = resolve(`release/zhijian-resume-${pkg.version}-windows`);
try { await access(target); throw new Error(`Release directory already exists: ${target}. Use a new version or move the old build aside.`); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(target, { recursive: true });
// Explicit allowlist: never copy the workspace, drafts, secrets or node_modules.
for (const name of ['dist/cli.cjs', 'dist/index.html', '.codex-plugin/plugin.json', '.mcp.json', 'skills/resume-editor/SKILL.md', 'install.cmd', 'scripts/install.ps1', 'assets', 'README.md', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CHANGELOG.md', 'TEST-REPORT.md', 'third-party/README.md', 'docs']) {
  await mkdir(join(target, name, '..'), { recursive: true });
  await cp(resolve(name), join(target, name), { recursive: true });
}
await writeFile(join(target, 'package.json'), JSON.stringify({ name: pkg.name, version: pkg.version, private: true, license: pkg.license, engines: pkg.engines }, null, 2));
console.log(`Windows release: ${target}`);
