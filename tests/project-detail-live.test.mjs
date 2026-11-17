import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseProjectDetail } from '../src/features/projects/ProjectDetailContract.ts';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const id = '11111111-1111-4111-8111-111111111111';
const taskId = '22222222-2222-4222-8222-222222222222';
const base = () => ({
  project: {
    id, key: 'PORTAL-1', name: 'Portal implementation', description: '',
    kind: 'internal', status: 'active', priority: 'normal',
    due_on: null, starts_on: '2026-11-01',
  },
  role: 'viewer',
  tasks: [{ id: taskId, title: 'Review contract', description: '',
    status: 'in_progress', priority: 'high', due_on: null }],
  milestones: [],
  members: [{ user_id: '33333333-3333-4333-8333-333333333333',
    full_name: 'Example Member', role: 'viewer', status: 'active' }],
  products: [], deliverables: [], comments: [], activity: [],
});

test('real detail decoder accepts backend projection and prevents cross-record substitution', () => {
  assert.equal(parseProjectDetail(base(), id)?.project.key, 'PORTAL-1');
  assert.equal(parseProjectDetail(base(), '44444444-4444-4444-8444-444444444444'), null);
  assert.equal(parseProjectDetail({ ...base(), role: 'super_admin' }, id), null);
  assert.equal(parseProjectDetail({ ...base(), project: { ...base().project, name: '' } }, id), null);
});

test('malformed, unauthorized-style and oversized responses never become detail UI data', () => {
  assert.equal(parseProjectDetail(null, id), null);
  assert.equal(parseProjectDetail({ message: 'Forbidden' }, id), null);
  assert.equal(parseProjectDetail({ ...base(), tasks: [base().tasks[0], base().tasks[0]] }, id), null);
  assert.equal(parseProjectDetail({ ...base(), tasks: [{ ...base().tasks[0], status: 'unknown' }] }, id), null);
  assert.equal(parseProjectDetail({ ...base(), tasks: Array(3001).fill(base().tasks[0]) }, id), null);
});

test('real project details use backend-only GET with strict route allowlisting', async () => {
  const api = await read('src/features/workspace/server-api.ts');
  const layout = await read('src/app/(workspace)/layout.tsx');
  const details = await read('src/app/(workspace)/projects/[id]/page.tsx');
  const list = await read('src/app/(workspace)/projects/page.tsx');
  assert.match(api, /permittedProjectDetail/);
  assert.match(api, /projectDetailPath/);
  assert.match(api, /cache: 'no-store'/);
  assert.match(layout, /portalApi\('\/api\/auth\/me'\)/);
  assert.match(details, /portalApi\('\/api\/projects\/' \+ id\)/);
  assert.match(details, /parseProjectDetail\(result\.value, id\)/);
  assert.match(details, /redirect\('\/login'\)/);
  assert.match(details, /if \(!uuid\.test\(id\)\) notFound\(\)/);
  assert.match(list, /href=\{'\/projects\/' \+ project\.id\}/);
  assert.doesNotMatch(details, /ProjectFixtures|exampleProjects|localStorage|sessionStorage|fetch\(/);
  assert.doesNotMatch(details, /method: 'POST'|method: 'PATCH'|method: 'DELETE'/);
});
