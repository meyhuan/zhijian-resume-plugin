// A local MCP host simulator, not evidence of ChatGPT host compatibility.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { connectClient } from './client';
import { findPdfBrowser } from '../server/browser';
import { DEMO_RESUME, type EditorSession } from '../shared';
const client = await connectClient(resolve('artifacts/ui-test-drafts'));
const browser = await puppeteer.launch({ headless: true, executablePath: findPdfBrowser() });
try {
  const initial = await client.callTool({ name: 'create_resume', arguments: { resume: DEMO_RESUME } });
  const session = initial._meta?.session as EditorSession;
  const page = await browser.newPage();
  let downloaded = false;
  await page.setViewport({ width: 1440, height: 1000 });
  await page.exposeFunction('hostRpc', async (message: any) => {
    if (message.method === 'ui/initialize') return { protocolVersion: '2026-01-26', hostInfo: { name: 'test-host', version: '1' }, hostCapabilities: { serverTools: {}, downloadFile: {} }, hostContext: { theme: 'light', displayMode: 'inline', availableDisplayModes: ['inline','fullscreen'] } };
    if (message.method === 'tools/call') return client.callTool(message.params);
    if (message.method === 'ui/download-file') {
      await writeFile('artifacts/ui-export.pdf', Buffer.from(message.params.contents[0].resource.blob, 'base64'));
      downloaded = true;
      return {};
    }
    return {};
  });
  await page.setContent('<html><body><iframe style="width:100%;height:950px;border:0"></iframe></body></html>');
  await page.evaluate((initial) => {
    window.addEventListener('message', async event => {
      const msg = event.data;
      const frame = document.querySelector('iframe')!;
      if (msg.method === 'ui/notifications/initialized') frame.contentWindow!.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: initial }, '*');
      if (msg.id !== undefined && msg.method) {
        try { const result = await (window as any).hostRpc(msg); frame.contentWindow!.postMessage({ jsonrpc: '2.0', id: msg.id, result }, '*'); }
        catch (e) { frame.contentWindow!.postMessage({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: String(e) } }, '*'); }
      }
    });
  }, initial);
  const html = await readFile('dist/index.html', 'utf8');
  await page.$eval('iframe', (el, html) => { el.srcdoc = html; }, html);
  const frame = page.frames().find(f => f.parentFrame())!;
  await frame.waitForSelector('select[aria-label="模板"]', { timeout: 30000 });
  await frame.waitForFunction(() => !document.querySelector<HTMLSelectElement>('select')?.disabled);
  await frame.waitForSelector('h1');
  await frame.click('h1');
  await frame.waitForSelector('input#name');
  await frame.click('input#name');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await frame.type('input#name','UI Edited Name');
  for (const button of await frame.$$('button')) if ((await button.evaluate(el=>el.textContent?.trim()))==='确定') { await button.click(); break; }
  await frame.select('select[aria-label="模板"]', 'elegant');
  await frame.$eval('input[aria-label="行间距"]', el => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!; set.call(el,'2'); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); });
  await frame.waitForFunction(() => document.querySelector('output')?.textContent === '2.00');
  // Verify real UI mutations reach the stdio store, rather than only changing DOM.
  await page.waitForFunction(() => true);
  let saved: EditorSession | undefined;
  for (let i=0;i<30;i++) {
    saved = (await client.callTool({ name:'open_resume_editor', arguments:{id:session.id,accessKey:session.accessKey} }))._meta?.result as EditorSession;
    if (saved.document.template==='elegant' && saved.document.themes.elegant?.lineHeight===2) break;
    await new Promise(r=>setTimeout(r,200));
  }
  assert.equal(saved!.document.template,'elegant'); assert.equal(saved!.document.themes.elegant.lineHeight,2);
  assert.equal(saved!.document.resume.name,'UI Edited Name');
  await page.screenshot({path:'artifacts/ui-smoke.png',fullPage:true});
  const buttons = await frame.$$('button');
  for (const button of buttons) if ((await button.evaluate(el=>el.textContent))==='导出分页 PDF') { await button.click(); break; }
  await frame.waitForSelector('[aria-label="PDF 分页预览"] canvas',{timeout:60000});
  for (const button of await frame.$$('button')) if ((await button.evaluate(el=>el.textContent))==='下载 PDF') { await button.click(); break; }
  for(let i=0;i<30 && !downloaded;i++) await new Promise(r=>setTimeout(r,200));
  assert.ok(downloaded);
  const loadingTask = getDocument({data:new Uint8Array(await readFile('artifacts/ui-export.pdf')),useSystemFonts:true});
  const pdf = await loadingTask.promise;
  let exportedText = '';
  for(let i=1;i<=pdf.numPages;i++) exportedText += (await (await pdf.getPage(i)).getTextContent()).items.map(item=>'str' in item ? item.str : '').join('');
  assert.ok(exportedText.includes('UI Edited Name'));
  await loadingTask.destroy();
  console.log('PASS: iframe handshake, edit name, template change, line height, autosave, PDF preview and download RPC');
} finally { await browser.close(); await client.close(); }
