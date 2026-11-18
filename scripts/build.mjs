import { build } from 'esbuild';
await build({ entryPoints: ['server/index.ts'], outfile: 'dist/cli.cjs', bundle: true, platform: 'node', target: 'node22', format: 'cjs' });
await import('./notices.mjs');
