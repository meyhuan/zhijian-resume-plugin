import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectClient } from './client';
import { resolve } from 'node:path';

import { DEMO_RESUME, type EditorSession } from '../shared';
test('MCP discovery, UI resource, create, save, conflict and authorization', async () => {
  const client = await connectClient(resolve('artifacts/test-drafts'));
  try {
    const tools = await client.listTools();
    assert.ok(tools.tools.some(t => t.name === 'create_resume'));
    const created = await client.callTool({ name: 'create_resume', arguments: { resume: DEMO_RESUME } });
    assert.equal(created.isError, undefined);
    const session = created._meta?.session as EditorSession;
    assert.ok(session.accessKey);
    assert.equal(JSON.stringify(created.structuredContent).includes(session.accessKey), false);
    const resources = await client.listResources();
    const ui = await client.readResource({ uri: resources.resources[0].uri });
    assert.match(String('text' in ui.contents[0] ? ui.contents[0].text : ''), /<script type="module"/);
    const args = { id: session.id, accessKey: session.accessKey, expectedRevision: 1, document: { ...session.document, resume: { ...session.document.resume, name: '更新后的姓名' } } };
    const saved = await client.callTool({ name: 'save_resume', arguments: args });
    assert.equal(saved.isError, undefined);
    const conflict = await client.callTool({ name: 'save_resume', arguments: args });
    assert.equal(conflict.isError, true);
    const shallow = { id: session.id, accessKey: session.accessKey, expectedRevision: 2, documentJson: JSON.stringify(args.document) };
    const serialized = await client.callTool({ name: 'save_resume', arguments: shallow });
    assert.equal(serialized.isError, undefined);
    const reopened = await client.callTool({ name: 'open_resume_editor', arguments: { id: session.id, accessKey: session.accessKey } });
    assert.equal((reopened._meta?.result as EditorSession).revision, 3);
    assert.equal((reopened._meta?.result as EditorSession).document.resume.name, '更新后的姓名');
    for (const documentJson of ['{invalid', JSON.stringify({ resume: {} })]) {
      const rejected = await client.callTool({ name: 'save_resume', arguments: { ...shallow, expectedRevision: 3, documentJson } });
      assert.equal(rejected.isError, true);
    }
    const ambiguous = await client.callTool({ name: 'save_resume', arguments: { ...shallow, document: args.document } });
    assert.equal(ambiguous.isError, true);
    const invalid = await client.callTool({ name: 'open_resume_editor', arguments: { id: session.id, accessKey: '0'.repeat(64) } });
    assert.equal(invalid.isError, true);
  } finally { await client.close(); }
});
