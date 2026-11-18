import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, openSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import type { EditorSession, Snapshot } from '../shared';
import { documentSchema, normalizeInput, resumeSchema, templateSchema } from './schema';
import { normalizeResumeFontTheme } from '../src/entities/theme/font-stacks';

export class DraftStore {
  private drafts = new Map<string, EditorSession>();
  constructor(private now = Date.now, private ttl = 86400000, private directory?: string) {
    if (directory) mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  private file(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('无效草稿 ID');
    return join(this.directory!, `${id}.json`);
  }
  private persist(draft: EditorSession) {
    if (!this.directory) return;
    const target = this.file(draft.id), temp = `${target}.${randomUUID()}.tmp`;
    writeFileSync(temp, JSON.stringify(draft), { mode: 0o600 });
    renameSync(temp, target);
    // Small local opener; resume content remains in the revisioned draft store.
    const opener = join(this.directory, `${draft.id}.zresume`);
    const openerTemp = `${opener}.${randomUUID()}.tmp`;
    writeFileSync(openerTemp, JSON.stringify({ id: draft.id, accessKey: draft.accessKey }), { mode: 0o600 });
    renameSync(openerTemp, opener);
  }
  sweep() { for (const [id, value] of this.drafts) if (value.expiresAt <= this.now()) this.drafts.delete(id); }
  create(raw: unknown, template = 'simple'): EditorSession {
    this.sweep();
    if (this.drafts.size >= 100) throw new Error('测试草稿已满，请稍后重试');
    const parsed = resumeSchema.parse(raw);
    const id = randomUUID();
    const session: EditorSession = { id, accessKey: randomBytes(32).toString('hex'), revision: 1, expiresAt: this.now() + this.ttl,
      document: { resume: normalizeInput(parsed, id), template: templateSchema.parse(template), themes: {} } };
    this.drafts.set(id, session);
    this.persist(session);
    return structuredClone(session);
  }
  read(id: string, key: string): EditorSession {
    if (this.directory) {
      try { this.drafts.set(id, JSON.parse(readFileSync(this.file(id), 'utf8'))); }
      catch { this.drafts.delete(id); }
    }
    this.sweep();
    const draft = this.drafts.get(id);
    if (!draft || !/^[a-f0-9]{64}$/.test(key) || !timingSafeEqual(Buffer.from(key), Buffer.from(draft.accessKey))) throw new Error('草稿不存在、已过期或访问凭据无效');
    return structuredClone(draft);
  }
  save(id: string, key: string, expectedRevision: number, raw: unknown): Snapshot {
    let lock: number | undefined;
    const lockPath = this.directory ? this.file(id) + '.lock' : undefined;
    if (lockPath) {
      try { lock = openSync(lockPath, 'wx'); }
      catch { throw new Error('草稿正在其它窗口保存，请稍后重试'); }
    }
    try {
    const draft = this.read(id, key);
    if (draft.revision !== expectedRevision) throw new Error('VERSION_CONFLICT：草稿已在其它窗口更新，当前修改已保留，请复制内容后重新打开');
    const data = documentSchema.parse(raw);
    draft.document = { ...data, resume: normalizeInput(data.resume, id), themes: Object.fromEntries(Object.entries(data.themes).map(([id, theme]) => [id, normalizeResumeFontTheme(theme)])) };
    draft.revision++;
    this.drafts.set(id, draft);
    this.persist(draft);
    return this.snapshot(draft);
    } finally { if (lock !== undefined && lockPath) { closeSync(lock); unlinkSync(lockPath); } }
  }
  snapshot(session: EditorSession): Snapshot {
    const { accessKey: _key, ...snapshot } = session;
    return structuredClone(snapshot);
  }
}
