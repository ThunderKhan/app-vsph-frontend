import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseMusicLaunch,trustedMusicStartUrl} from '../src/features/music/MusicLaunchContract.ts';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const url='https://music.example.test/api/sso/start',id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('Music launch never trusts a backend-supplied URL except the server-approved SSO start',()=>{
 assert.equal(trustedMusicStartUrl(url),url);
 for(const bad of ['https://evil.example.test/redirect','javascript:alert(1)',
   'https://music.example.test/api/sso/start?redirect=x','https://music.example.test/old/api/sso/start','https://user:pass@music.example.test/api/sso/start'])
   assert.equal(trustedMusicStartUrl(bad),null);
 const reply={enabled:true,startUrl:url,organizations:[{id,name:'Client Org',role:'admin'}]};
 assert.equal(parseMusicLaunch(reply,url)?.organizations[0].id,id);
 assert.equal(parseMusicLaunch(reply,'https://another.example.test/api/sso/start'),null);
 assert.equal(parseMusicLaunch({...reply,organizations:[...reply.organizations,...reply.organizations]},url),null);
 assert.equal(parseMusicLaunch({...reply,enabled:false},url),null);
});
test('Music page is authenticated, server-read, no fixture credentials or external arbitrary launch',async()=>{
 const page=await read('src/app/(workspace)/apps/music/launch/page.tsx');
 const api=await read('src/features/workspace/server-api.ts');
 const ui=await read('src/features/music/MusicLaunchWorkspace.tsx');
 assert.match(page,/portalApi\('\/api\/sso\/config\/MUSIC'\)/);
 assert.match(page,/process.env.MUSIC_SSO_START_URL/);
 assert.match(api,/permittedMusicConfig/);
 assert.match(ui,/organization_id/);
 assert.doesNotMatch(page+ui,/OperationsFixtures|NEXT_PUBLIC_|localStorage|sessionStorage/);
});
