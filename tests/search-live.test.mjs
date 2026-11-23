import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('live search uses the original restricted API with validated filters and records',async()=>{
  const contract=await read('src/features/search/SearchContract.ts');
  const route=await read('src/app/api/search/route.ts');
  const api=await read('src/features/workspace/server-api.ts');
  assert.match(contract,/length>25/);
  assert.match(contract,/new Set\(names\)/);
  assert.match(contract,/assigneeId.*kind!=='task'/);
  assert.match(route,/validatedSearchParams/);
  assert.match(route,/portalApi\('\/api\/search\?'/);
  assert.match(api,/permittedWorkSearch/);
  assert.match(route,/parseSearchPage/);
  assert.doesNotMatch(route,/NEXT_PUBLIC_|fetch\(request|OperationsFixtures/);
});
test('search page does not persist user queries in URL, local storage or fixtures',async()=>{
  const ui=await read('src/features/search/LiveSearch.tsx');
  const nav=await read('src/features/workspace/WorkspaceHeader.tsx');
  assert.match(ui,/AbortController/);
  assert.match(ui,/setPage\(null\)/);
  assert.match(ui,/credentials:'same-origin'/);
  assert.match(ui,/project_id/);
  assert.match(nav,/href="\/search"/);
  assert.doesNotMatch(ui,/localStorage|sessionStorage|pushState|router\.push|ProjectFixtures/);
});
