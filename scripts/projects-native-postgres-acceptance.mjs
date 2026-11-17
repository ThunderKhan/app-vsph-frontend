/**
 * Full-stack acceptance with native PostgreSQL, the real legacy Express routes,
 * backend project_command SQL, and the actual production Next.js gateway/UI.
 *
 * The CI job exclusively creates an empty disposable loopback database named
 * vsph_test. This script refuses any other database address and never consumes
 * hosted credentials or user production data.
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

const backendRequire = createRequire(new URL('../.acceptance-backend/package.json', import.meta.url));
const { Pool } = backendRequire('pg');
const { hashToken } = backendRequire('./tokens.js');
const input = process.env.TEST_DATABASE_URL;
assert.ok(input, 'TEST_DATABASE_URL required for isolated acceptance');
const database = new URL(input);
assert.ok(['localhost','127.0.0.1','[::1]'].includes(database.hostname) &&
  database.pathname === '/vsph_test' && ['postgres:','postgresql:'].includes(database.protocol) &&
  !database.search && !database.hash,
  'Refusing non-loopback or non-vsph_test database');
const api = 'http://127.0.0.1:47045';
const admin='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const viewer='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const outsider='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const pool=new Pool({connectionString:input, max:4});
const tokens={};
const show={checks:0};

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const check=(condition,message)=>{assert.ok(condition,message); show.checks++};
async function call(path,{method='GET',token,origin=api,body}={}) {
  const headers={};
  if(token) headers.Cookie='vsph.portal.sid='+token;
  if(method!=='GET') {
    headers.Origin=origin;
    headers['Content-Type']='application/json';
    headers['Sec-Fetch-Site']='same-origin';
  }
  const response=await fetch(api+path,{
    method, headers, redirect:'manual', cache:'no-store',
    body:body===undefined?undefined:JSON.stringify(body),
    signal:AbortSignal.timeout(12000),
  });
  const raw=await response.text();
  let data;
  try {data=JSON.parse(raw);} catch {data=raw;}
  return {status:response.status,data,raw,headers:response.headers};
}
async function version(id) {
  const result=await pool.query('select version from public.projects where id=$1',[id]);
  check(result.rowCount===1,'Expected exactly one persisted project');
  return result.rows[0].version;
}
async function expectStatus(path,options,status,description) {
  const result=await call(path,options);
  assert.equal(result.status,status,description+': '+String(result.raw).slice(0,320));
  show.checks++;
  return result;
}

try {
  const initialized=await pool.query("select to_regclass('public.portal_sessions') session, to_regclass('public.projects') projects");
  check(Boolean(initialized.rows[0].session && initialized.rows[0].projects),
    'Backend fixture schema not installed');
  console.log('Acceptance stage 1: schema verified, generating disposable sessions');
  // These are real production-format, random sessions, inserted ONLY into disposable vsph_test.
  for(const [label,id] of [['admin',admin],['viewer',viewer],['outsider',outsider]]) {
    const token=randomBytes(32).toString('base64url');
    tokens[label]=token;
    await pool.query(
      "insert into public.portal_sessions(token_hash,user_id,expires_at) values($1,$2,now()+ interval '90 minutes')",
      [hashToken(token),id]
    );
  }
  const key='ACCEPT-'+randomBytes(4).toString('hex').toUpperCase();
  const name='Integration acceptance '+key;
  const create={key,name,description:'Disposable integration fixture',kind:'internal',
    priority:'normal',startsOn:'',dueOn:''};
  await expectStatus('/api/projects',{method:'POST',body:create},401,'Missing session');
  await expectStatus('/api/projects',{method:'POST',token:tokens.admin,
    origin:'https://evil.invalid',body:create},403,'CSRF cross-origin');
  await expectStatus('/api/projects',{method:'POST',token:tokens.viewer,body:create},
    403,'Ordinary employee cannot create projects');
  await expectStatus('/api/projects',{method:'POST',token:tokens.outsider,body:create},
    403,'Outsider cannot create projects');
  console.log('Acceptance stage 2: anonymous and non-admin creation denials confirmed');
  const created=await expectStatus('/api/projects',{
    method:'POST',token:tokens.admin,body:create,
  },201,'Admin creates real internal project');
  const id=created.data?.id;
  check(typeof id==='string'&&uuid.test(id),'Real backend must return project UUID');
  const stored=await pool.query('select key,name,version from public.projects where id=$1',[id]);
  check(stored.rows[0].key===key&&stored.rows[0].name===name&&stored.rows[0].version===1,
    'Project must be committed to native PostgreSQL');
  const adminList=await expectStatus('/projects',{token:tokens.admin},200,'Authorized portfolio page');
  check(adminList.raw.includes(name) || adminList.raw.includes('Projects'),'Authenticated portfolio rendered');
  const ownerPage=await expectStatus('/projects/'+id,{token:tokens.admin},200,'Authorized project page');
  check(ownerPage.raw.includes(name)&&ownerPage.raw.includes('Add task') &&
    ownerPage.raw.includes('Add milestone'), 'Real project details show manager work actions');
  const guestDetail=await expectStatus('/projects/'+id,{token:tokens.outsider},200,
    'Unauthorized project page fails closed with access message');
  check(!guestDetail.raw.includes(name)&&guestDetail.raw.includes('Project details unavailable'),
    'Outsider must not see project data');
  await expectStatus('/api/projects/'+id,{method:'PATCH',token:tokens.outsider,
    body:{version:1,name:'Intrusion',description:'',priority:'normal',dueOn:''}},
    403,'Outsider cannot mutate project');

  console.log('Acceptance stage 3: creation persisted and role-scoped project pages loaded');
  // Add a viewer directly to this disposable DB to prove the backend enforces role restrictions.
  await pool.query("insert into public.project_memberships(project_id,user_id,role,status) values($1,$2,'viewer','active')",[id,viewer]);
  const viewerPage=await expectStatus('/projects/'+id,{token:tokens.viewer},200,'Viewer reads own project');
  check(viewerPage.raw.includes(name)&&!viewerPage.raw.includes('Add task'),
    'Viewer can read permitted project but cannot see management controls');
  await expectStatus('/api/projects/'+id+'/tasks',{
    method:'POST',token:tokens.viewer,
    body:{version:1,title:'Unauthorized',description:'',priority:'normal',dueOn:''},
  },403,'Viewer cannot create task');
  const edited=await expectStatus('/api/projects/'+id,{
    method:'PATCH',token:tokens.admin,
    body:{version:1,name:name+' edited',description:'Version verified',priority:'high',dueOn:''},
  },200,'Manager edits project metadata');
  check(edited.data.updated===true && await version(id)===2,'Metadata must persist and increment version');
  await expectStatus('/api/projects/'+id,{
    method:'PATCH',token:tokens.admin,
    body:{version:1,name:'Stale edit',description:'',priority:'low',dueOn:''},
  },409,'Stale metadata edit cannot overwrite');
  console.log('Acceptance stage 4: role permissions and stale version rejection verified');
  // Two simultaneous manager edits against the SAME current version must serialize safely.
  const attempts=await Promise.all([
    call('/api/projects/'+id,{method:'PATCH',token:tokens.admin,
      body:{version:2,name:'Concurrent A '+key,description:'',priority:'normal',dueOn:''}}),
    call('/api/projects/'+id,{method:'PATCH',token:tokens.admin,
      body:{version:2,name:'Concurrent B '+key,description:'',priority:'normal',dueOn:''}}),
  ]);
  check(attempts.filter(x=>x.status===200).length===1 &&
    attempts.filter(x=>x.status===409).length===1,
    'Concurrent writes must yield exactly one success and one HTTP 409');
  check(await version(id)===3,'Concurrent updates must increment version exactly once');

  console.log('Acceptance stage 5: concurrent writes serialized safely');
  const milestone=await expectStatus('/api/projects/'+id+'/milestones',{
    method:'POST',token:tokens.admin,body:{version:3,title:'Acceptance milestone',dueOn:''},
  },200,'Manager creates milestone');
  const milestoneId=milestone.data?.id;
  check(uuid.test(milestoneId)&&milestone.data.version===4,
    'Milestone creation returns actual ID and version 4');
  const task=await expectStatus('/api/projects/'+id+'/tasks',{
    method:'POST',token:tokens.admin,
    body:{version:4,title:'Acceptance task',description:'Persisted task',
      priority:'high',dueOn:''},
  },200,'Manager creates task');
  const taskId=task.data?.id;
  check(uuid.test(taskId)&&task.data.version===5,'Task creation persisted with version 5');
  await expectStatus('/api/projects/'+id+'/tasks/'+taskId,{
    method:'PATCH',token:tokens.admin,body:{version:4,status:'in_progress'},
  },409,'Task stale version must conflict');
  await expectStatus('/api/projects/'+id+'/tasks/'+taskId,{
    method:'PATCH',token:tokens.viewer,body:{version:5,status:'in_progress'},
  },403,'Viewer status updates blocked');
  for(const [status,current] of [['in_progress',5],['in_review',6],['done',7]]) {
    const reply=await expectStatus('/api/projects/'+id+'/tasks/'+taskId,{
      method:'PATCH',token:tokens.admin,body:{version:current,status},
    },200,'Manager task lifecycle '+status);
    check(reply.data.version===current+1&&reply.data.id===taskId,
      'Task lifecycle has verified entity and next version');
  }
  for(const [status,current] of [['active',8],['done',9]]) {
    const reply=await expectStatus('/api/projects/'+id+'/milestones/'+milestoneId,{
      method:'PATCH',token:tokens.admin,body:{version:current,status},
    },200,'Manager milestone lifecycle '+status);
    check(reply.data.version===current+1&&reply.data.id===milestoneId,
      'Milestone lifecycle has verified entity and next version');
  }
  console.log('Acceptance stage 6: task and milestone transitions completed');
  const persisted=await pool.query(
    'select p.version,t.status task_status,m.status milestone_status from public.projects p '+
    'join public.project_tasks t on t.project_id=p.id and t.id=$2 '+
    'join public.project_milestones m on m.project_id=p.id and m.id=$3 where p.id=$1',
    [id,taskId,milestoneId]
  );
  check(persisted.rowCount===1&&persisted.rows[0].version===10 &&
    persisted.rows[0].task_status==='done'&&persisted.rows[0].milestone_status==='done',
    'Task and milestone lifecycle persisted in native PostgreSQL');
  const detailed=await expectStatus('/projects/'+id,{token:tokens.admin},200,
    'Reload actual frontend project details');
  check(detailed.raw.includes('Acceptance task')&&detailed.raw.includes('Acceptance milestone'),
    'Frontend reload displays persisted task and milestone');

  await pool.query("update public.project_memberships set status='revoked' where project_id=$1 and user_id=$2",[id,viewer]);
  const revoked=await expectStatus('/projects/'+id,{token:tokens.viewer},200,'Revoked member navigation');
  check(!revoked.raw.includes('Acceptance task')&&revoked.raw.includes('Project details unavailable'),
    'Revoked member immediately loses project visibility');
  await expectStatus('/api/projects/'+id+'/tasks',{
    method:'POST',token:tokens.viewer,
    body:{version:10,title:'After revocation',description:'',priority:'normal',dueOn:''},
  },403,'Revoked member still cannot mutate');

  console.log('NATIVE POSTGRESQL FULL-STACK ACCEPTANCE PASSED',JSON.stringify({
    checks:show.checks,projectId:id,taskId,milestoneId,
    evidence:'real Express routes + service RPC + PostgreSQL + Next.js',
    liveServicesUsed:false,realSupabaseAuthTested:false,
  }));
} finally {
  await pool.end();
}
