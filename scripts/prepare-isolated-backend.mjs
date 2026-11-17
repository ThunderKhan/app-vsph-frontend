/**
 * Temporary, explicitly scoped patch in an ISOLATED GitHub Actions checkout.
 * The source backend repository's latest Outreach migration has
 * "AS $" / "END$;" instead of PostgreSQL's "AS $$" / "END$$;".
 *
 * Do not modify production or hosted migration state here. Refuse unknown
 * revisions instead of silently changing unrelated SQL.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const path='.acceptance-backend/supabase/migrations/20261111100000_outreach_internal_sso.sql';
let source=await readFile(path,'utf8');
const from='returns jsonb language plpgsql security definer set search_path=\\'\\' as $\\ndeclare live_role text;';
const to='returns jsonb language plpgsql security definer set search_path=\\'\\' as $$\\ndeclare live_role text;';
assert.equal(source.split(from).length,2,'Unexpected source: no isolated overlay permitted');
source=source.replace(from,to);
const ending='\\nend$;\\nrevoke all on function public.outreach_introspect(uuid,text)';
const corrected='\\nend$$;\\nrevoke all on function public.outreach_introspect(uuid,text)';
assert.equal(source.split(ending).length,2,'Unexpected ending: no isolated overlay permitted');
source=source.replace(ending,corrected);
await writeFile(path,source,'utf8');
console.log('Applied test-only two-token SQL delimiter overlay to disposable backend checkout. Upstream defect remains outstanding.');
