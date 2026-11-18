import { App } from '@modelcontextprotocol/ext-apps';
import { OpenAIExtensions, OpenAIFileEntrypointInputSchema } from '@openai/mcp-extensions/app';
import type { EditorSession } from '../shared';
type Initial = { session: EditorSession; baseUrl: string };
let client: App | undefined;
export async function connect(onInitial: (data: Initial) => void): Promise<void> {
  if (window.parent === window) return;
  client = new App({ name: '智简简历', version: '0.4.0' }, {});
  const extensions = new OpenAIExtensions(client);
  client.ontoolresult = result => {
    const opened = OpenAIFileEntrypointInputSchema.safeParse(result.structuredContent);
    if (opened.success) {
      void (async () => {
        if (!extensions.resources) throw new Error('宿主不支持本地文件读取');
        const response = await extensions.resources.read({ uri: opened.data.file.resourceUri, representation: 'blob' });
        const contents = response.contents[0];
        if (!contents || !('blob' in contents) || typeof contents.blob !== 'string') throw new Error('简历入口文件无效');
        const credentials = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(contents.blob), c => c.charCodeAt(0))));
        const session = await callTool<EditorSession>('open_resume_editor', { id: credentials.id, accessKey: credentials.accessKey });
        onInitial({ session, baseUrl: 'local' });
      })().catch(error => window.dispatchEvent(new CustomEvent('resume-connection-error', { detail: String(error.message) })));
      return;
    }
    const metadata = result._meta as Initial | undefined;
    if (metadata?.session && metadata.baseUrl) {
      // Tool results can be replayed when a conversation is reopened.
      void callTool<EditorSession>('open_resume_editor', { id: metadata.session.id, accessKey: metadata.session.accessKey })
        .then(session => onInitial({ session, baseUrl: metadata.baseUrl }))
        .catch(error => { window.dispatchEvent(new CustomEvent('resume-connection-error', { detail: String(error.message) })); });
    }
  };
  await client.connect();
}
export async function callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (!client) throw new Error('尚未连接桌面宿主');
  const result = await client.callServerTool({ name, arguments: args });
  if (result.isError) throw new Error(result.content?.filter(c => c.type === 'text').map(c => c.text).join('\n') || '操作失败');
  return result._meta?.result as T;
}
export async function expand() { if (client) await client.requestDisplayMode({ mode: 'fullscreen' }); }
export async function downloadPdf(base64: string) {
  if (client) {
    const result = await client.downloadFile({ contents: [{ type: 'resource', resource: { uri: 'file:///resume.pdf', mimeType: 'application/pdf', blob: base64 } }] });
    if (result.isError) throw new Error('宿主未能下载文件，请重试或重新打开编辑器');
  } else {
    const link = document.createElement('a'); link.href = `data:application/pdf;base64,${base64}`; link.download = 'resume.pdf'; link.click();
  }
}
