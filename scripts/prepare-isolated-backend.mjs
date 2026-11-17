/**
 * Narrow, test-only fix for known un-applied 2026-11-11 Outreach SQL typo.
 * Upstream repo remains untouched; production data is never accessed.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const path='.acceptance-backend/supabase/migrations/20261111100000_outreach_internal_sso.sql';
let source=await readFile(path,'utf8');
const from="returns jsonb language plpgsql security definer set search_path='' as $\ndeclare live_role text;";
const to="returns jsonb language plpgsql security definer set search_path='' as $$\ndeclare live_role text;";
assert.equal(source.split(from).length,2,'Unexpected source: isolated overlay refused');
source=source.replace(from,()=>to);
const ending="\nend$;\nrevoke all on function public.outreach_introspect(uuid,text)";
const corrected="\nend$$;\nrevoke all on function public.outreach_introspect(uuid,text)";
assert.equal(source.split(ending).length,2,'Unexpected ending: isolated overlay refused');
source=source.replace(ending,()=>corrected);
assert.ok(source.includes(to) && source.includes(corrected) && !source.includes(from) && !source.includes(ending),
  'Repaired SQL quoting must be present before starting the fixture');
// CURRENT_ROLE is PostgreSQL's special SQL expression, not a safe PL/pgSQL variable.
assert.equal((source.match(/\bcurrent_role\b/g)||[]).length,4,
  'Unrecognized Outreach variable references: overlay refused');
source=source.replace(/\bcurrent_role\b/g,'resolved_role');
assert.ok(!source.includes('current_role'),'Reserved identifier still present');
await writeFile(path,source,'utf8');
// The upstream fixture launcher masks its actual database error in the catch.
// Add diagnostic logging ONLY in this disposable checkout.
const fixture='.acceptance-backend/tests/e2e/fixture-server.js';
let fixtureSource=await readFile(fixture,'utf8');
const handler="start(new Pool({ connectionString: url.toString() })).catch(() => {";
assert.equal(fixtureSource.split(handler).length,2,'Unexpected fixture launcher: diagnostic overlay refused');
fixtureSource=fixtureSource.replace(handler,
  "start(new Pool({ connectionString: url.toString() })).catch((error) => { console.error('Fixture SQL error:', error.code, error.message);");
await writeFile(fixture,fixtureSource,'utf8');

console.log('Applied two-token SQL quoting correction in disposable test checkout ONLY. Upstream defect remains outstanding.');
