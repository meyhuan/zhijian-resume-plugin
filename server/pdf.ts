import puppeteer from 'puppeteer-core';
import type { Snapshot } from '../shared';
import { getPrintLayoutDiagnostics, preparePrintFragmentation } from '../src/lib/print-pagination';
import { findPdfBrowser } from './browser';
let busy = false;
export async function renderPdf(widgetHtml: string, snapshot: Snapshot): Promise<Uint8Array> {
  if (busy) throw new Error('PDF 正在生成，请稍后重试');
  busy = true;
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, executablePath: findPdfBrowser() });
    const page = await browser.newPage();
    page.setDefaultTimeout(45000);
    await page.setViewport({ width: 1280, height: 1123, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const target = new URL(request.url());
      if (['data:', 'blob:', 'about:'].includes(target.protocol)) void request.continue();
      else void request.abort();
    });
    const payload = JSON.stringify(snapshot).replaceAll('<', '\\u003c');
    await page.setContent(widgetHtml.replace('<head>', `<head><script>window.__RESUME_PRINT__=${payload}</script>`), { waitUntil: 'load' });
    await page.waitForSelector('[data-print-ready="true"]');
    await page.evaluate(async () => { await document.fonts.ready; });
    const html = await page.evaluate(() => (window as unknown as { getResumeExportHtml: () => string }).getResumeExportHtml());
    await page.setJavaScriptEnabled(false);
    await page.emulateMediaType('print');
    await page.setContent(html, { waitUntil: 'load', timeout: 45000 });
    await page.evaluate(async () => { await document.fonts.ready; });
    // tsx/esbuild may preserve function names with this helper in serialized callbacks.
    await page.evaluate('window.__name = (fn) => fn');
    await page.evaluate(preparePrintFragmentation);
    const diagnostics = await page.evaluate(getPrintLayoutDiagnostics);
    if (diagnostics.hiddenOverflowAncestors > 0 || diagnostics.transformedRoot) throw new Error('打印布局存在裁切，请调整后重试');
    return await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, timeout: 45000 });
  } finally {
    try { await browser?.close(); } finally { busy = false; }
  }
}
