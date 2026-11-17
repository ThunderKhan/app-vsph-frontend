'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { LiveProject, LiveTask } from './ProjectLiveContract';
import type { ProjectWorkforce } from './ProjectMemberEligibility';
import { ProjectMemberPicker } from './ProjectMemberPicker';
import { parseEligibleEmployees } from './ProjectMemberEligibility';

type Props={project:LiveProject;workforce:ProjectWorkforce|null;actorId:string|null};
type Tab='overview'|'team'|'tasks'|'discussions';
const tabs:Tab[]=['overview','team','tasks','discussions'];
const title=(s:string)=>s.replaceAll('_',' ').replace(/\b\w/g,ch=>ch.toUpperCase());
const states:LiveTask['status'][]=['todo','in_progress','blocked','in_review','done','cancelled'];

export function LiveProjectWorkspace({project,workforce,actorId}:Props){
  const [tab,setTab]=useState<Tab>('overview');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [taskFilter,setTaskFilter]=useState('');
  const [assignments,setAssignments]=useState<Record<string,string>>({});
  const [memberRoles,setMemberRoles]=useState<Record<string,'manager'|'contributor'|'viewer'>>({});
  const [newTaskTitle,setNewTaskTitle]=useState('');
  const [newTaskDescription,setNewTaskDescription]=useState('');
  const [newTaskPriority,setNewTaskPriority]=useState<LiveTask['priority']>('normal');
  const [newTaskDue,setNewTaskDue]=useState('');
  const [newTaskAssignee,setNewTaskAssignee]=useState('');
  const [taskStates,setTaskStates]=useState<Record<string,LiveTask['status']>>({});
  const [commentText,setCommentText]=useState('');
  const [commentTask,setCommentTask]=useState('');
  const [discussionFilter,setDiscussionFilter]=useState('all');
  const closed=project.status==='archived'||project.status==='completed';
  const canManage=project.role==='manager'&&!closed;
  const canAssign=canManage&&workforce?.canAssign===true;
  const canDiscuss=!closed&&(project.role==='manager'||project.role==='contributor');
  const members=project.members.filter(m=>m.status==='active');
  const membersById=new Map(project.members.map(m=>[m.userId.toLowerCase(),m.name]));
  const assignees=members.filter(m=>m.role==='manager'||m.role==='contributor');
  const eligible=workforce?parseEligibleEmployees({
    canGovernManagers:workforce.canGovernManagers,canAssign:workforce.canAssign,
    staff:workforce.staff.map(s=>({user_id:s.userId,full_name:s.name,
      department:s.team,project_role:s.role,membership_status:s.status,open_tasks:s.openTasks}))
  })??[]:[];
  const shownTasks=project.tasks.filter(t=>!taskFilter||t.status===taskFilter);
  const shownComments=project.comments.filter(c=>discussionFilter==='all'||
    (discussionFilter==='general'?c.taskId===null:c.taskId===discussionFilter));
  const taskTitle=new Map(project.tasks.map(t=>[t.id.toLowerCase(),t.title]));
  const openTasksFor=(id:string)=>workforce?.staff.find(s=>s.userId.toLowerCase()===id.toLowerCase())?.openTasks??0;

  async function mutate(operation:string,payload:Record<string,unknown>){
    if(busy)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/project-actions/'+encodeURIComponent(project.id)+'/'+operation,{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({version:project.version,...payload})
      });
      if(response.status===401){window.location.assign('/login');return;}
      if(!response.ok){
        const data:unknown=await response.json().catch(()=>null);
        const message=data&&typeof data==='object'&&'message' in data&&
          typeof data.message==='string'?data.message:'Project change failed. Please retry.';
        setError(message);
        if(response.status===409)setError('Someone edited this project first. Reload before retrying.');
        return;
      }
      // Always reload the authoritative version; never apply an optimistic access grant.
      window.location.reload();
    }catch{setError('The project service could not be reached. No change was confirmed.');}
    finally{setBusy(false);}
  }
  function onComment(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!canDiscuss||!commentText.trim()||busy)return;
    void mutate('comment-create',{body:commentText.trim(),taskId:commentTask||null,shared:false});
  }
  function taskStatusAllowed(task:LiveTask){
    return canManage||(project.role==='contributor'&&!!actorId&&
      task.assigneeId?.toLowerCase()===actorId.toLowerCase()&&!closed);
  }
  return <main className="workspace-content project-workspace live-project-detail"
      id="mainContent" tabIndex={-1}>
    <nav className="project-live-breadcrumb" aria-label="Breadcrumb">
      <Link href="/projects">Projects</Link><span aria-hidden="true">/</span><span>{project.key}</span>
    </nav>
    <header className="project-heading">
      <div><h1>{project.name}</h1><p>{project.key} · {title(project.status)} · {title(project.priority)}</p></div>
      <div className="actions"><button type="button" onClick={()=>window.location.reload()}
          disabled={busy}>Refresh</button></div>
    </header>
    {project.description&&<p className="project-live-description">{project.description}</p>}
    {closed&&<p role="status" className="project-live-note">This project is {project.status}.
      Collaboration changes are disabled.</p>}
    {error&&<p className="feedback-state error-state" role="alert">{error}</p>}
    <nav className="project-live-tabs" aria-label="Project views">
      {tabs.map(value=><button key={value} type="button" className={tab===value?'is-active':''}
        aria-current={tab===value?'page':undefined} onClick={()=>{setTab(value);setError('');}}>
        {title(value)}</button>)}
    </nav>
    {tab==='overview'&&<section className="project-live-panel" aria-label="Project overview">
      <h2>Project overview</h2>
      <div className="project-live-metrics">
        <div><span>Tasks</span><strong>{project.tasks.length}</strong></div>
        <div><span>Completed</span><strong>{project.tasks.filter(t=>t.status==='done').length}</strong></div>
        <div><span>Active members</span><strong>{members.length}</strong></div>
        <div><span>Comments</span><strong>{project.comments.length}</strong></div>
      </div>
      <p>Metrics are calculated from backend-authorized project records, not preview fixtures.</p>
    </section>}
    {tab==='team'&&<section className="project-live-panel" aria-label="Project team">
      <h2>Project team</h2>
      <p>Team membership does not grant HR privileges or customer product access.</p>
      <div className="project-table-wrap" role="region" aria-label="Project member list" tabIndex={0}>
        <table><thead><tr><th>Member</th><th>Team</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{project.members.map(m=>{
            const isOwner=m.userId.toLowerCase()===project.ownerId.toLowerCase();
            const openTasks=openTasksFor(m.userId);
            return <tr key={m.userId}>
              <td><strong>{m.name}</strong>{isOwner&&<small>Accountable owner</small>}</td>
              <td>{m.team||'—'}</td><td>{title(m.role)}</td><td>{title(m.status)}</td>
              <td>{canAssign&&m.status==='active'&&!isOwner? 
                <div className="project-member-controls">
                  {m.role==='manager'?
                    (workforce?.canGovernManagers&&<button type="button" disabled={busy}
                      onClick={()=>void mutate('manager-revoke',{userId:m.userId})}>
                      Demote to contributor</button>):
                    m.role==='client'?'Customer membership managed separately':<>
                      <label>Role
                        <select aria-label={'Role for '+m.name}
                          value={memberRoles[m.userId]??m.role} disabled={busy}
                          onChange={e=>setMemberRoles(p=>({...p,[m.userId]:
                            e.target.value as 'manager'|'contributor'|'viewer'}))}>
                          <option value="contributor">Contributor</option>
                          <option value="viewer">Viewer</option>
                          {workforce?.canGovernManagers&&<option value="manager">Manager</option>}
                        </select>
                      </label>
                      <button type="button"
                        disabled={busy||(memberRoles[m.userId]??m.role)===m.role||
                          ((memberRoles[m.userId]??m.role)==='viewer'&&openTasks>0)}
                        onClick={()=>void mutate('member-assign',{userId:m.userId,
                          role:memberRoles[m.userId]??m.role,team:m.team})}>Save role</button>
                      <button type="button" disabled={busy||openTasks>0}
                        title={openTasks>0?'Reassign open tasks first':undefined}
                        onClick={()=>void mutate('member-remove',{userId:m.userId})}>Remove access</button>
                    </>}
                </div> : '—'}</td>
            </tr>;
          })}</tbody></table>
      </div>
      {canManage&&<div className="project-live-subpanel">
        <h3>Add an internal employee</h3>
        {workforce?.canAssign?
          <ProjectMemberPicker employees={eligible} existingMemberIds={members.map(m=>m.userId)}
            isPlatformOwner={workforce.canGovernManagers} busy={busy}
            onSubmit={({employee,role})=>mutate('member-assign',
              {userId:employee.userId,role,team:employee.team})}/>:
          <p role="status">The workforce directory or assignment permission is unavailable.
            No changes can be made until it is verified.</p>}
      </div>}
    </section>}
    {tab==='tasks'&&<section className="project-live-panel" aria-label="Project tasks">
      <h2>Tasks and assignments</h2>
      {canManage&&<form className="project-live-create-task"
        onSubmit={event=>{event.preventDefault();if(!newTaskTitle.trim()||busy)return;
          void mutate('task-create',{title:newTaskTitle.trim(),description:newTaskDescription,
            priority:newTaskPriority,dueOn:newTaskDue,assigneeId:newTaskAssignee||null,
            milestoneId:null,shared:false});
        }}>
        <h3>Create task</h3>
        <label>Task title <input required maxLength={200} value={newTaskTitle}
          disabled={busy} onChange={e=>setNewTaskTitle(e.target.value)}/></label>
        <label>Description <textarea maxLength={5000} value={newTaskDescription}
          disabled={busy} onChange={e=>setNewTaskDescription(e.target.value)}/></label>
        <div className="project-live-create-grid">
          <label>Priority <select disabled={busy} value={newTaskPriority}
            onChange={e=>setNewTaskPriority(e.target.value as LiveTask['priority'])}>
            {(['low','normal','high','urgent'] as const).map(p=>
              <option key={p} value={p}>{title(p)}</option>)}
          </select></label>
          <label>Due date <input type="date" disabled={busy} value={newTaskDue}
            onChange={e=>setNewTaskDue(e.target.value)}/></label>
          <label>Assignee <select disabled={busy} value={newTaskAssignee}
            onChange={e=>setNewTaskAssignee(e.target.value)}>
            <option value="">Unassigned</option>
            {assignees.map(m=><option key={m.userId} value={m.userId}>{m.name}</option>)}
          </select></label>
        </div>
        <button type="submit" disabled={busy||!newTaskTitle.trim()}>
          {busy?'Saving…':'Create task'}</button>
      </form>}
      <label>Filter by state <select value={taskFilter}
        onChange={e=>setTaskFilter(e.target.value)}>
        <option value="">All tasks</option>{states.map(s=><option value={s} key={s}>{title(s)}</option>)}
      </select></label>
      {!shownTasks.length&&<p>No tasks match this filter.</p>}
      <div className="project-live-task-list">{shownTasks.map(t=>{
        const nextAssignee=assignments[t.id]??t.assigneeId??'';
        const nextStatus=taskStates[t.id]??t.status;
        return <article className="project-live-task" key={t.id}>
          <div className="project-live-task-head"><div>
            <h3>{t.title}</h3><p>{t.description||'No description'}</p></div>
            <span>{title(t.priority)} · {t.dueOn||'No due date'}</span>
          </div>
          <div className="project-live-task-actions">
            <label>Assignee
              <select aria-label={'Assignee for '+t.title} value={nextAssignee}
                disabled={!canAssign||busy} onChange={e=>setAssignments(p=>({...p,[t.id]:e.target.value}))}>
                <option value="">Unassigned</option>
                {assignees.map(m=><option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select></label>
            {canAssign&&<button type="button" disabled={busy||nextAssignee===(t.assigneeId??'')}
              onClick={()=>void mutate('task-assign',{taskId:t.id,assigneeId:nextAssignee||null})}>
              Save assignment</button>}
            <label>State <select aria-label={'State for '+t.title} value={nextStatus}
              disabled={!taskStatusAllowed(t)||busy}
              onChange={e=>setTaskStates(p=>({...p,[t.id]:e.target.value as LiveTask['status']}))}>
              {states.map(s=><option value={s} key={s}>{title(s)}</option>)}</select></label>
            {taskStatusAllowed(t)&&<button type="button" disabled={busy||nextStatus===t.status}
              onClick={()=>void mutate('task-status',{taskId:t.id,status:nextStatus})}>
              Update state</button>}
            <button type="button" onClick={()=>{setTab('discussions');setDiscussionFilter(t.id);setCommentTask(t.id);}}>
              Discussion ({project.comments.filter(c=>c.taskId===t.id).length})</button>
          </div>
        </article>;
      })}</div>
    </section>}
    {tab==='discussions'&&<section className="project-live-panel" aria-label="Project discussions">
      <h2>Project and task discussions</h2>
      <label>Show comments <select value={discussionFilter}
        onChange={e=>setDiscussionFilter(e.target.value)}>
        <option value="all">All comments</option><option value="general">General project comments</option>
        {project.tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
      </select></label>
      <div className="project-live-comments" aria-live="polite">
        {!shownComments.length&&<p>No comments in this discussion.</p>}
        {shownComments.map(c=><article key={c.id} className="project-live-comment">
          <div><strong>{membersById.get(c.actorId.toLowerCase())||'Project member'}</strong>
            <span>{new Date(c.createdAt).toLocaleString()}</span></div>
          <p>{c.body}</p>
          <small>{c.taskId?taskTitle.get(c.taskId.toLowerCase())||'Task discussion':'Project discussion'}
            {' · '}{c.shared?'Shared with authorized client viewers':'Internal'}</small>
        </article>)}
      </div>
      {canDiscuss&&<form className="project-live-comment-form" onSubmit={onComment}>
        <h3>Add a comment</h3>
        <label>Discussion
          <select value={commentTask} onChange={e=>setCommentTask(e.target.value)}
            disabled={busy}>
            <option value="">General project discussion</option>
            {project.tasks.map(t=><option value={t.id} key={t.id}>{t.title}</option>)}
          </select></label>
        <label>Comment <textarea required minLength={1} maxLength={4000} rows={4}
          value={commentText} disabled={busy} onChange={e=>setCommentText(e.target.value)}/></label>
        <p>Comments created here are internal only. Customer sharing is not enabled.</p>
        <button type="submit" disabled={busy||!commentText.trim()}>
          {busy?'Saving…':'Post comment'}</button>
      </form>}
    </section>}
  </main>;
}
