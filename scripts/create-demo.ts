import { connectClient } from '../tests/client';
import { DEMO_RESUME, type EditorSession } from '../shared';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { copyFile } from 'node:fs/promises';
const directory = join(process.env.LOCALAPPDATA || homedir(), 'ZhijianResume', 'drafts');
const client = await connectClient(directory);
try {
  const created = await client.callTool({ name: 'create_resume', arguments: { resume: DEMO_RESUME } });
  if (created.isError) throw new Error(JSON.stringify(created.content));
  const session = created._meta?.session as EditorSession;
  await copyFile(join(directory, `${session.id}.zresume`), 'artifacts/desktop-demo.zresume');
  console.log('Demo opener: artifacts/desktop-demo.zresume');
} finally { await client.close(); }
