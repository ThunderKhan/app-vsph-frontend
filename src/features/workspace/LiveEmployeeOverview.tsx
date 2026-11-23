import Link from 'next/link';
import type {OwnWork} from '@/features/employee-work/OwnWorkContract';
import type {EmployeeActivity} from './EmployeeActivityContract';
type Props={work:OwnWork;activity:EmployeeActivity|null};
const active=(status:string)=>!['done','cancelled'].includes(status);
function Heatmap({activity}:{activity:EmployeeActivity|null}){
 if(!activity)return <section className="employee-live-panel">
   <h2>Work activity</h2>
   <p role="status">Recorded completion history is temporarily unavailable. No sample activity is displayed.</p>
 </section>;
 const values=new Map(activity.days.map(d=>[d.date,d.count]));
 const start=Date.parse(activity.windowStart+'T00:00:00Z');
 const weeks=Array.from({length:365},(_,i)=>{
   const key=new Date(start+i*86400000).toISOString().slice(0,10);
   return {date:key,count:values.get(key)||0};
 });
 const level=(n:number)=>n===0?0:n===1?1:n<4?2:n<8?3:4;
 return <section className="employee-live-panel">
   <div className="employee-live-panel-heading"><h2>Task completion activity</h2>
     <span>{activity.total} recorded completions</span></div>
   <p className="employee-live-muted">Last 365 company workdays · Asia/Kolkata. This reflects
     your own recorded transitions to Done, not productivity or working hours.</p>
   <div className="employee-activity-scroll" role="region" tabIndex={0}
       aria-label="365 days of recorded task completion activity, horizontally scrollable">
     <div className="employee-activity-grid" role="img"
       aria-label={'Recorded activity: '+activity.total+' completions from '+activity.windowStart+' to '+activity.windowEnd}>
       {weeks.map(x=><span key={x.date} className="employee-activity-cell"
         data-level={level(x.count)}
         title={x.date+': '+x.count+' task completion'+(x.count===1?'':'s')}/>)}
     </div>
   </div>
   <p className="employee-live-muted">Most frequent authorized projects (maximum 3):</p>
   {!activity.projects.length?<p>{activity.total===0?'No task completions were recorded in this window.':'No authorized project breakdown is available.'}</p>:
     <ul>{activity.projects.map(p=><li key={p.name}>{p.name} · {p.count} completion{p.count===1?'':'s'}</li>)}</ul>}
 </section>;
}
export function LiveEmployeeOverview({work,activity}:Props){
 const incomplete=work.tasks.filter(t=>active(t.status));
 const overdue=incomplete.filter(t=>t.due_on!==null&&t.due_on<work.workDate);
 const checkedIn=work.attendance.find(a=>a.work_day===work.workDate&&a.status==='open');
 const todayAttendance=work.attendance.find(a=>a.work_day===work.workDate);
 const pending=work.leave.filter(r=>r.status==='pending');
 return <section className="employee-live-overview" aria-labelledby="employeeLiveHeading">
   <header className="employee-live-header">
     <div><p className="employee-live-kicker">YOUR WORK, AT A GLANCE</p>
       <h1 id="employeeLiveHeading">My dashboard</h1>
       <p>{work.employee.name} · {work.employee.department} · {work.employee.jobTitle}</p>
     </div><div className="employee-live-shortcuts">
       <Link href="/my-work">Open My Work</Link><Link href="/calendar">Calendar</Link>
     </div>
   </header>
   <div className="employee-live-summary">
     <article><span>Active assigned tasks</span><strong>{incomplete.length}</strong>
       <small>Of {work.tasks.length} visible assignments</small></article>
     <article><span>Overdue assignments</span><strong>{overdue.length}</strong>
       <small>Open tasks with due dates before {work.workDate}</small></article>
     <article><span>Attendance today</span>
       <strong className="employee-live-status">{checkedIn?'Checked in':todayAttendance?
         todayAttendance.status.replaceAll('_',' '):'Not checked in'}</strong>
       <small>Company workday · Asia/Kolkata</small></article>
     <article><span>Pending leave</span><strong>{pending.length}</strong>
       <small>Of {work.leave.length} recent requests</small></article>
   </div>
   {work.tasks.length===50&&<p className="employee-live-muted">Showing the first 50 assigned tasks.
     Open My Work to review additional pages.</p>}
   <div className="employee-live-sections">
     <section className="employee-live-panel">
       <div className="employee-live-panel-heading"><h2>Assigned tasks</h2>
         <Link href="/my-work">Manage tasks</Link></div>
       {!work.tasks.length&&<p>No assigned tasks are available.</p>}
       <ul>{work.tasks.slice(0,8).map(t=><li key={t.id}>
         <strong>{t.title}</strong><span>{t.project_name} · {t.status.replaceAll('_',' ')}
           · Due {t.due_on||'not set'}</span>
       </li>)}</ul>
       {work.tasks.length>8&&<p className="employee-live-muted">More tasks are available in My Work.</p>}
     </section>
     <section className="employee-live-panel">
       <div className="employee-live-panel-heading"><h2>Leave and attendance</h2>
         <Link href="/my-work">Review records</Link></div>
       <p>Leave requests require HR review. No leave balance, payroll hours or entitlement is inferred.</p>
       <ul>{work.leave.slice(0,5).map(r=><li key={r.id}>
         <strong>{r.kind} · {r.status}</strong>
         <span>{r.start_on} to {r.end_on}</span></li>)}</ul>
       {!work.leave.length&&<p>No recent leave requests.</p>}
     </section>
     <Heatmap activity={activity}/>
   </div>
 </section>;
}
