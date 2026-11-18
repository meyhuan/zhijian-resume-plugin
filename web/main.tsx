import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState, Suspense, lazy, Component, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { useAppStore } from '@/state/store';
import { getTemplate, getPublicTemplates } from '@/templates/template-loader';
import { useEditorUiStore } from '@/state/editor-ui-store';
import { getRenderableResume } from '@/entities/resume/renderable-resume';
import { buildResumeHtml } from '@/io/html-export';
import { buildResumeFontFaceCss } from '@/entities/theme/font-stacks';
import { ResumeActionWorkspace } from '@/components/blocks/resume-action-dock';
import { connect, callTool, expand, downloadPdf } from './bridge';
import type { EditorDocument, EditorSession, Snapshot } from '../shared';
import './style.css';
import brandIcon from '../assets/icon.png';
const PdfPreview = lazy(() => import('./pdf-preview'));
const printSnapshot = (window as unknown as { __RESUME_PRINT__?: Snapshot }).__RESUME_PRINT__;
const printTicket = Boolean(printSnapshot);

class TemplateBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <p role="alert">模板加载失败，请切换其它模板或重新打开。</p> : this.props.children; }
}
function Ready({ children, onReady }: { children: ReactNode; onReady: () => void }) {
  useEffect(() => { let alive = true; void document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => { if (alive) onReady(); }))); return () => { alive = false; }; }, [onReady]);
  return children;
}
function Editor() {
  const [session, setSession] = useState<EditorSession>();
  const [baseUrl, setBaseUrl] = useState(location.origin);
  const [tpl, setTpl] = useState('simple');
  const [sidebarIds, setSidebarIds] = useState<string[]>();
  const [ack, setAck] = useState('');
  const [status, setStatus] = useState('等待桌面宿主传入简历');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pdf, setPdf] = useState<{ base64: string; fingerprint: string }>();
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);
  const canvas = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const resume = useAppStore(s => s.resume);
  const themes = useAppStore(s => s.themes);
  const editingIds = useEditorUiStore(s => s.editingBlockIds);
  const theme = themes[tpl] || useAppStore.getState().getThemeForTemplate(tpl);
  const current: EditorDocument = { resume, template: tpl, themes, sidebarSectionIds: sidebarIds };
  const fingerprint = JSON.stringify(current);
  const latest = useRef(current); latest.current = current;
  const sessionRef = useRef(session); sessionRef.current = session;
  const saved = useRef('');
  const inFlight = useRef<Promise<void> | null>(null);
  const initialized = useRef(false);

  function initialize(data: { session: EditorSession; baseUrl: string }) {
    if (initialized.current) return;
    initialized.current = true;
    const incoming = data.session;
    useAppStore.setState({ resume: incoming.document.resume, themes: incoming.document.themes, pastStates: [], futureStates: [], readOnly: Boolean(printTicket) });
    setTpl(incoming.document.template); setSidebarIds(incoming.document.sidebarSectionIds);
    setSession(incoming); sessionRef.current = incoming; setBaseUrl(data.baseUrl);
    const value = JSON.stringify(incoming.document); saved.current = value; setAck(value); setStatus('已保存到此电脑');
  }
  useEffect(() => {
    const onError = (event: Event) => setError((event as CustomEvent<string>).detail);
    window.addEventListener('resume-connection-error', onError);
    if (printTicket) {
      initialize({ session: { ...printSnapshot!, accessKey: '' }, baseUrl: 'local' });
    } else void connect(initialize).catch(e => setError(e.message));
    return () => window.removeEventListener('resume-connection-error', onError);
  }, []);
  useEffect(() => {
    const node = area.current; if (!node || printTicket) return;
    const resize = new ResizeObserver(() => setScale(Math.min(1, Math.max(.25, (node.clientWidth - 32) / 794))));
    resize.observe(node); return () => resize.disconnect();
  }, [session]);
  async function saveLatest() {
    if (inFlight.current) await inFlight.current;
    const credentials = sessionRef.current;
    if (!credentials || printTicket || JSON.stringify(latest.current) === saved.current) return;
    const snapshot = structuredClone(latest.current);
    const pendingFingerprint = JSON.stringify(snapshot);
    setStatus('正在保存…');
    const operation = (async () => {
      const result = await callTool<Snapshot>('save_resume', { id: credentials.id, accessKey: credentials.accessKey, expectedRevision: credentials.revision, documentJson: pendingFingerprint });
      credentials.revision = result.revision;
      saved.current = pendingFingerprint; setAck(pendingFingerprint); setStatus('已保存到此电脑'); setError('');
    })();
    inFlight.current = operation;
    try { await operation; } finally { if (inFlight.current === operation) inFlight.current = null; }
  }
  useEffect(() => {
    if (!session || printTicket || fingerprint === ack || error || busy) return;
    setStatus('有未保存修改');
    const timer = setTimeout(() => { void saveLatest().catch(e => { setError(e.message); setStatus('保存失败，修改仍保留'); }); }, 1200);
    return () => clearTimeout(timer);
  }, [fingerprint, ack, session, error, busy]);
  useEffect(() => {
    if (!printTicket || !canvas.current) return;
    (window as unknown as { getResumeExportHtml: () => string }).getResumeExportHtml = () => buildResumeHtml(canvas.current!, { title: 'Resume' });
  }, [session]);
  async function exportPdf() {
    if (busy || !ready) return;
    setBusy(true); setError(''); useAppStore.getState().setReadOnly(true);
    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      await saveLatest();
      const credentials = sessionRef.current!;
      const sent = JSON.stringify(latest.current);
      const result = await callTool<{ base64: string }>('export_resume_pdf', { id: credentials.id, accessKey: credentials.accessKey, revision: credentials.revision });
      setPdf({ base64: result.base64, fingerprint: sent });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); useAppStore.getState().setReadOnly(false); }
  }
  function backup() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(latest.current, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'resume-draft.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const Template = getTemplate(tpl)?.component;
  const templates = getPublicTemplates();
  if (!templates.some(t => t.id === 'simple')) templates.unshift(getTemplate('simple')!);
  return <div className={printTicket ? 'print-app' : 'editor-app'}>
    <style>{buildResumeFontFaceCss(`${baseUrl}/fonts`)}</style>
    {!printTicket && <header>
      <div className="brand"><img src={brandIcon} width="28" height="28" alt="" /><strong>智简简历</strong><span className="notice">本地桌面版 · 自动保存到此电脑</span></div>
      <div className="toolbar">
        <label>模板 <select aria-label="模板" disabled={busy || !session} value={tpl} onChange={e => { setReady(false); setTpl(e.target.value); }}>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>行间距 <input aria-label="行间距" type="range" min="1.2" max="2.5" step="0.05" disabled={busy || !session} value={theme.lineHeight} onChange={e => useAppStore.getState().setThemeForTemplate(tpl, draft => { draft.lineHeight = Number(e.target.value); })} /><output>{theme.lineHeight.toFixed(2)}</output></label>
        <button disabled={busy || !session} onClick={() => useAppStore.getState().undo()}>撤销</button>
        <button disabled={busy || !session} onClick={() => useAppStore.getState().redo()}>重做</button>
        <button onClick={() => { void expand().catch(e => setError(e.message)); }}>展开编辑</button>
        <button className="primary" disabled={!session || busy || !ready} onClick={() => { void exportPdf(); }}>{busy ? '正在生成 PDF…' : '导出分页 PDF'}</button>
      </div>
      <div role="status">{status}{session && fingerprint !== ack ? ' · 有未保存修改' : ''}</div>
      {error && <div role="alert" className="error">{error} <button onClick={() => { setError(''); void saveLatest().catch(e => setError(e.message)); }}>重试保存</button><button onClick={backup}>备份内容</button></div>}
    </header>}
    {!session ? <div className="empty"><h1>在对话中编辑你的简历</h1><p>内容生成后，直接在这里修改、切换模板、调整行距并导出。</p><p>请调用桌面插件创建简历；支持文件入口的宿主也可打开 .zresume 文件。</p>{error && <p role="alert">{error}</p>}</div> :
      <ResumeActionWorkspace><div className="canvas-scroll" ref={area}>
        <div className="canvas-scale" style={printTicket ? undefined : { zoom: scale }}>
          <div ref={canvas} className="page" data-print-ready={ready ? 'true' : 'false'}>
            <TemplateBoundary key={tpl}><Suspense fallback={<p>正在加载模板…</p>}>
              <Ready onReady={() => setReady(true)}><div className="resume-document-main" data-one-page="false">
                {Template && <Template resume={getRenderableResume(resume, editingIds)} theme={theme} sidebarSectionIds={sidebarIds} onSidebarSectionIdsChange={ids => setSidebarIds([...ids])} />}
              </div></Ready>
            </Suspense></TemplateBoundary>
          </div>
        </div>
      </div></ResumeActionWorkspace>}
    {pdf && !printTicket && <div className="preview-overlay" role="dialog" aria-modal="true" aria-label="PDF 分页预览">
      <div className="preview"><div className="toolbar"><strong>PDF 分页预览</strong><button onClick={() => setPdf(undefined)}>返回编辑</button><button className="primary" disabled={pdf.fingerprint !== fingerprint} onClick={() => { void downloadPdf(pdf.base64).catch(e => setError(e.message)); }}>下载 PDF</button></div>
        {error && <p role="alert" className="error">{error}</p>}
        {pdf.fingerprint !== fingerprint && <p>内容已更新，请返回编辑并重新生成 PDF。</p>}
        <Suspense fallback={<p>正在加载预览…</p>}><PdfPreview base64={pdf.base64} /></Suspense>
      </div>
    </div>}
    <Toaster />
  </div>;
}
createRoot(document.getElementById('root')!).render(<Editor />);
