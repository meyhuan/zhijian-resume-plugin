import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as worker from 'pdfjs-dist/build/pdf.worker.min.mjs';
// Use the bundled main-thread worker. No external worker URL or CSP exception.
(globalThis as unknown as { pdfjsWorker: unknown }).pdfjsWorker = worker;
export default function PdfPreview({ base64 }: { base64: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('正在加载分页预览…');
  useEffect(() => {
    const task = getDocument({ data: Uint8Array.from(atob(base64), c => c.charCodeAt(0)), useWorkerFetch: false }); let cancelled = false;
    const render = async () => {
      const pdf = await task.promise;
      if (cancelled || !root.current) return;
      root.current.replaceChildren();
      setStatus(`实际 PDF 共 ${pdf.numPages} 页`);
      for (let i = 1; i <= pdf.numPages && !cancelled; i++) {
        const page = await pdf.getPage(i);
        if (cancelled || !root.current) return;
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height;
        canvas.setAttribute('aria-label', `第 ${i} 页`); root.current.append(canvas);
        await page.render({ canvas, viewport }).promise;
      }
    };
    void render().catch(error => { if (!cancelled) setStatus(`预览失败：${error.message}`); });
    return () => { cancelled = true; void task.destroy(); };
  }, [base64]);
  return <><p role="status">{status}</p><div className="pdf-pages" ref={root} /></>;
}
