import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DraftStore } from '../server/store';
import { DEMO_RESUME } from '../shared';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('disk drafts survive restarts and independently running stores detect conflicts', () => {
  const directory = mkdtempSync(join(tmpdir(), 'resume-store-'));
  const a = new DraftStore(Date.now, 86400000, directory);
  const session = a.create(DEMO_RESUME);
  const b = new DraftStore(Date.now, 86400000, directory);
  assert.deepEqual(b.read(session.id, session.accessKey), JSON.parse(JSON.stringify(session)));
  const doc = structuredClone(session.document); doc.template = 'elegant';
  b.save(session.id, session.accessKey, 1, doc);
  assert.throws(() => a.save(session.id, session.accessKey, 1, session.document), /VERSION_CONFLICT/);
  assert.equal(a.read(session.id, session.accessKey).document.template, 'elegant');
  assert.throws(() => b.read('../../private', session.accessKey));
});
test('drafts require their own capability and preserve revision on conflicts', () => {
  const store = new DraftStore();
  const a = store.create(DEMO_RESUME), b = store.create(DEMO_RESUME);
  assert.throws(() => store.read(a.id, b.accessKey));
  const doc = structuredClone(a.document); doc.resume.name = '用户修改';
  const saved = store.save(a.id, a.accessKey, 1, doc);
  assert.equal(saved.revision, 2); assert.equal(saved.document.resume.name, '用户修改');
  assert.equal('accessKey' in saved, false);
  assert.throws(() => store.save(a.id, a.accessKey, 1, a.document), /VERSION_CONFLICT/);
  assert.equal(store.read(a.id, a.accessKey).document.resume.name, '用户修改');
});
test('expired and restarted drafts cannot be read', () => {
  let now = 1; const store = new DraftStore(() => now, 10); const a = store.create(DEMO_RESUME);
  now = 12; assert.throws(() => store.read(a.id, a.accessKey));
  assert.throws(() => new DraftStore().read(a.id, a.accessKey));
});
test('rejects invalid blocks, templates and unsafe image sources; sanitizes markup', () => {
  const store = new DraftStore();
  assert.throws(() => store.create({ name: 'x', sections: [{ title: 'x', blocks: [{ type: 'unknown' }] }] }));
  assert.throws(() => store.create(DEMO_RESUME, 'missing-template'));
  assert.throws(() => store.create({ ...DEMO_RESUME, baseInfo: { avatarUrl: 'http://127.0.0.1/private' } }));
  const session = store.create({ name: '测试', sections: [{ title: '简介', blocks: [{ type: 'text', html: '<p onclick="alert(1)">可见<script>alert(1)</script><img src="http://internal"></p>' }] }] });
  const block = session.document.resume.sections[0].blocks[0];
  assert.equal(block.type === 'text' && block.html, '<p>可见</p>');
  assert.ok(block.id); assert.ok(session.document.resume.sections[0].id);
});
