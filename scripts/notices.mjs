import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const supplements = {
  '@cfworker/json-schema': 'third-party/cfworker-LICENSE',
  '@napi-rs/canvas-win32-x64-msvc': 'node_modules/@napi-rs/canvas/LICENSE',
  '@puppeteer/browsers': 'third-party/puppeteer-LICENSE',
  'puppeteer-core': 'third-party/puppeteer-LICENSE',
  'degenerator': 'third-party/degenerator-LICENSE',
  'react-remove-scroll-bar': 'third-party/react-remove-scroll-bar-LICENSE',
};
const output = ['# Third-party notices', '', 'Generated from package-lock.json and installed npm package license/notice files.', 'Runtime dependencies are bundled; development dependencies are listed for source-build transparency.', 'Platform-specific optional dependencies absent on the build machine are listed by metadata only.', 'License texts below govern the respective components; the project Apache-2.0 license does not replace them.', ''];
for (const [path, info] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b))) {
  if (!path) continue;
  const name = path.split('node_modules/').at(-1);
  output.push(`## ${name}@${info.version}`, '', `License metadata: ${info.license || 'See package license'}. Scope: ${info.dev ? 'development' : 'runtime'}.`, `Source: https://www.npmjs.com/package/${name}/v/${info.version}`, '');
  let entries;
  try { entries = await readdir(path, { withFileTypes: true }); }
  catch (error) { if (!info.optional) throw error; output.push('Optional package not installed on this platform.', ''); continue; }
  const files = entries.filter(e => e.isFile() && /^(licen[cs]e|copying|notice)([.-]|$)/i.test(e.name));
  if (!files.length && supplements[name]) output.push('### Upstream license supplement', '', '````text', (await readFile(supplements[name], 'utf8')).trim(), '````', '');
  else if (!files.length && !info.dev) throw new Error(`Missing runtime license text: ${name}`);
  for (const file of files) output.push(`### ${file.name}`, '', '````text', (await readFile(join(path, file.name), 'utf8')).trim(), '````', '');
}
await writeFile('THIRD_PARTY_NOTICES.md', output.join('\n'));
console.log('Generated THIRD_PARTY_NOTICES.md');
