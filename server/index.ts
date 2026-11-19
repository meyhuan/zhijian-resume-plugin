import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DraftStore } from './store';
import { resumeSchema, documentSchema, templateSchema } from './schema';
import { renderPdf } from './pdf';

async function main() {
const legacyDirectory = join(process.env.LOCALAPPDATA || homedir(), 'ZhijianResume', 'drafts');
const defaultDirectory = process.platform === 'darwin' && !existsSync(legacyDirectory)
  ? join(homedir(), 'Library', 'Application Support', 'ZhijianResume', 'drafts')
  : legacyDirectory;
const directory = process.env.RESUME_DATA_DIR || defaultDirectory;
const store = new DraftStore(Date.now, 10 * 365 * 86400000, directory);
const html = await readFile(join(__dirname, 'index.html'), 'utf8');
const uri = `ui://zhijian/editor-${createHash('sha256').update(html).digest('hex').slice(0,12)}.html`;
const mcp = new McpServer({ name: 'zhijian-resume', version: '0.4.0' });
registerAppTool(mcp, 'view_resume_file', {
  title: '打开本地简历', description: '打开此电脑保存的 .zresume 简历入口文件。',
  inputSchema: { file: z.object({ name: z.string(), resourceUri: z.string() }) },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  _meta: { ui: { resourceUri: uri, visibility: ['app'] }, 'openai/ui': { entrypoints: [{ type: 'file', extensions: ['.zresume'] }] } },
}, async ({ file }) => ({ content: [{ type: 'text', text: `打开 ${file.name}` }], structuredContent: { file } }));
registerAppResource(mcp, 'resume-editor', uri, {}, async () => ({ contents: [{ uri, mimeType: RESOURCE_MIME_TYPE, text: html, _meta: {
  ui: { csp: { connectDomains: [], resourceDomains: [] } },
  'openai/ui': { availableDisplayModes: ['inline', 'fullscreen'] },
  'openai/widgetDescription': '本地简历编辑器：修改内容、切换模板、调整行距、导出分页 PDF。',
} }] }));
registerAppTool(mcp, 'create_resume', {
  title: '打开智简简历编辑器', description: '根据用户提供的经历创建本地简历并打开内嵌编辑器。不要编造经历。草稿保存在用户电脑，无需联网服务。',
  inputSchema: { resume: resumeSchema, template: templateSchema.default('simple') },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  _meta: { ui: { resourceUri: uri } },
}, async ({ resume, template }) => {
  const session = store.create(resume, template);
  return { content: [{ type: 'text', text: '已打开本地简历编辑器。修改将自动保存到电脑，可切换模板、调整行距并导出 PDF。' }], structuredContent: { id: session.id, revision: session.revision }, _meta: { session, baseUrl: 'local' } };
});
const credentials = { id: z.string().uuid(), accessKey: z.string().regex(/^[a-f0-9]{64}$/) };
for (const [name, schema] of Object.entries({
  open_resume_editor: z.object(credentials),
  save_resume: z.object({ ...credentials, expectedRevision: z.number().int().positive(), document: documentSchema.optional(), documentJson: z.string().max(4_000_000).optional() }).refine(value => (value.document !== undefined) !== (value.documentJson !== undefined), '必须提供且仅提供一种文档格式'),
  export_resume_pdf: z.object({ ...credentials, revision: z.number().int().positive() }),
})) registerAppTool(mcp, name, {
  title: name, description: '当前已授权简历的编辑器内部操作。', inputSchema: schema,
  annotations: { readOnlyHint: name !== 'save_resume', destructiveHint: false, openWorldHint: false },
  _meta: { ui: { visibility: ['app'] } },
}, async (args: Record<string, unknown>): Promise<CallToolResult> => {
  try {
    const input = args as { id: string; accessKey: string; expectedRevision: number; revision: number; document: unknown; documentJson?: string };
    let result: unknown;
    if (name === 'save_resume') {
      // Some MCP Apps hosts limit nesting in app tool arguments. Keep the legacy
      // object input for existing clients and validate the serialized form equally.
      const document = input.documentJson === undefined ? input.document : documentSchema.parse(JSON.parse(input.documentJson));
      result = store.save(input.id, input.accessKey, input.expectedRevision, document);
    }
    else {
      const session = store.read(input.id, input.accessKey);
      if (name === 'open_resume_editor') result = session;
      else {
        if (session.revision !== input.revision) throw new Error('VERSION_CONFLICT：请先保存最新内容');
        const data = await renderPdf(html, store.snapshot(session));
        if (data.byteLength > 6 * 1024 * 1024) throw new Error('PDF 超过本地传输限制（6 MB），请缩小头像或减少内容');
        result = { base64: Buffer.from(data).toString('base64'), fileName: 'resume.pdf', revision: session.revision };
      }
    }
    return { content: [{ type: 'text', text: '操作完成' }], _meta: { result } };
  } catch (error) { return { isError: true, content: [{ type: 'text', text: error instanceof z.ZodError ? '输入格式不正确' : (error as Error).message }] }; }
});
await mcp.connect(new StdioServerTransport());
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
