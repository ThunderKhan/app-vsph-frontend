import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const load = file => readFile(new URL('../' + file, import.meta.url), 'utf8');
test('member selection only uses eligible backend-provided internal employees', async () => {
  const model = await load('src/features/projects/ProjectMemberEligibility.ts');
  const picker = await load('src/features/projects/ProjectMemberPicker.tsx');
  assert.match(model, /row\.status !== 'active'/);
  assert.match(model, /row\.identity_linked !== true/);
  assert.match(model, /row\.employee_type !== 'internal'/);
  assert.match(model, /seen\.has\(row\.user_id\.toLowerCase\(\)\)/);
  assert.match(model, /role !== 'manager' \|\| isPlatformOwner/);
  assert.match(picker, /existingMemberIds/);
  assert.match(picker, /canChooseMembershipRole\(role, isPlatformOwner\)/);
  assert.match(picker, /isPlatformOwner && <option value="manager">/);
  assert.doesNotMatch(model + picker, /localStorage|sessionStorage|ProjectFixtures|fetch\(/);
});
test('picker cannot submit in disabled, busy, or invalid states', async () => {
  const picker = await load('src/features/projects/ProjectMemberPicker.tsx');
  assert.match(picker, /if \(blocked \|\| !valid \|\| !selected\) return/);
  assert.match(picker, /disabled=\{blocked \|\| !valid\}/);
  assert.match(picker, /available\.find\(person => person\.userId === userId\)/);
});
