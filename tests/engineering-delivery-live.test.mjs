import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDeliveryData,safeGithubUrl} from '../src/features/projects/EngineeringDeliveryContract.ts';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('GitHub delivery display rejects provider tokens, unsafe URLs, and oversized rows',()=>{
 const base={configured:false,providerMode:'live-unverified',
  vercel:{enabled:false,reason:'No project mapping'},
  installations:[],connections:[],records:[],events:[],links:[]};
 assert.equal(parseDeliveryData(base)?.connections.length,0);
 assert.equal(parseDeliveryData({...base,vercel:{enabled:true,reason:'No project mapping'}}),null);
 assert.equal(parseDeliveryData({...base,records:Array.from({length:201},()=>({}))}),null);
 assert.equal(safeGithubUrl('https://github.com/org/repo/pull/12'),true);
 assert.equal(safeGithubUrl('https://github.com.evil.example/repo'),false);
 assert.equal(safeGithubUrl('https://github.com@evil.example/repo'),false);
});
test('engineering delivery requires original project authorization and server-owned read',async()=>{
 const api=await read('src/features/workspace/server-api.ts');
 const page=await read('src/app/(workspace)/projects/[id]/engineering/page.tsx');
 assert.match(api,/permittedEngineeringDelivery/);
 assert.match(page,/project.role==='client'/);
 assert.match(page,/portalApi\('\/api\/projects\/'\+id\+'\/delivery'\)/);
 assert.doesNotMatch(page,/ProjectFixtures|OperationsFixtures|NEXT_PUBLIC_|localStorage/);
});

test('engineering view includes actual observations and never imports demo provider records',async()=>{
 const ui=await read('src/features/projects/EngineeringDeliveryWorkspace.tsx');
 const detail=await read('src/app/(workspace)/projects/[id]/page.tsx');
 assert.match(ui,/delivery.records.filter/);
 assert.match(ui,/delivery.connections.map/);
 assert.match(ui,/No repository connections. No development activity is fabricated/);
 assert.match(detail,/View GitHub delivery evidence/);
 assert.doesNotMatch(ui+detail,/EngineeringFixtures|sampleGithubRecords|mockProvider|Math.random/);
});
