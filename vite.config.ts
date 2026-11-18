import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react(), tailwind(), viteSingleFile()],
  base: './',
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: '@/components/ai-section/ai-section-provider', replacement: resolve('web/ai-adapter.tsx') },
      { find: '@/lib/analytics', replacement: resolve('web/analytics-adapter.ts') },
      { find: '@', replacement: resolve('src') },
    ],
  },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: { target: 'es2022', cssCodeSplit: false, sourcemap: false, rollupOptions: { output: { inlineDynamicImports: true } } },
});
