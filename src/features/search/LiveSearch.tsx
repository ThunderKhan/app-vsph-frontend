'use client';
import Link from 'next/link';
import {useRef,useState,type FormEvent} from 'react';
import {parseSearchPage,searchKinds,searchStatuses,type SearchPage} from './SearchContract';
const fields=['q','kind','status','projectId','organizationId','assigneeId','from','to'] as const;
type SearchForm=Record<typeof fields[number],string>;
const empty:SearchForm={q:'',kind:'all',status:'',projectId:'',organizationId:'',assigneeId:'',from:'',to:''};
const label=(s:string)=>s.replaceAll('_',' ');
export function LiveSearch(){
 const [filters,setFilters]=useState<SearchForm>(empty);
 const [page,setPage]=useState<SearchPage|null>(null);
 const [message,setMessage]=useState('No search has been run.');
 const [busy,setBusy]=useState(false);
 const [searched,setSearched]=useState(false);
 const [hasLater,setHasLater]=useState(false);
 const controller=useRef<AbortController|null>(null);
 const sequence=useRef(0);
 const committed=useRef<SearchForm|null>(null);
 const resultsRef=useRef<HTMLElement>(null);
 function invalidate(){
   controller.current?.abort();sequence.current+=1;setPage(null);setBusy(false);setHasLater(false);
   committed.current=null;setSearched(false);
   setMessage('Filters changed. Search again to see current results.');
 }
 function change(name:typeof fields[number],value:string){
   invalidate();setFilters(old=>({...old,[name]:value}));
 }
 async function search(after:string|null=null,form:SearchForm|null=null){
   const data=form||committed.current;
   if(!data)return;
   controller.current?.abort();
   const abort=new AbortController();controller.current=abort;
   const current=++sequence.current;
   setBusy(true);setPage(null);setHasLater(false);
   setMessage('Searching current project work…');
   committed.current={...data};
   const params=new URLSearchParams();
   for(const name of fields){if(data[name].trim())params.set(name,data[name].trim());}
   if(after)params.set('after',after);
   try{
     const response=await fetch('/api/search?'+params.toString(),{credentials:'same-origin',cache:'no-store',signal:abort.signal});
     const raw:unknown=await response.json().catch(()=>null);
     if(current!==sequence.current)return;
     if(response.status===401){window.location.assign('/login');return;}
     if(!response.ok){
       const reason=raw&&typeof raw==='object'&&'message' in raw&&typeof raw.message==='string'?raw.message:
         'Search is unavailable. Retry after the dependency recovers.';
       throw Error(reason);
     }
     const parsed=parseSearchPage(raw);
     if(!parsed)throw Error('Search returned an invalid response.');
     setPage(parsed);setHasLater(Boolean(after));setSearched(true);
     setMessage(parsed.results.length?
       parsed.results.length+' matches on this page'+(parsed.nextCursor?'; more results are available.':'.'):
       'No authorized matching work found.');
     requestAnimationFrame(()=>resultsRef.current?.focus());
   }catch(error){
     if(current!==sequence.current||abort.signal.aborted)return;
     setPage(null);setMessage(error instanceof Error?error.message:'Search is unavailable. Retry.');
   }finally{if(current===sequence.current)setBusy(false);}
 }
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();void search(null,filters);}
 function clear(){controller.current?.abort();sequence.current+=1;committed.current=null;
  setFilters(empty);setPage(null);setSearched(false);setHasLater(false);setBusy(false);setMessage('No search has been run.');}
 return <main className="workspace-content search-live" id="mainContent" tabIndex={-1}>
   <header><div><h1>Find project work</h1></div></header>
   <section className="search-panel" aria-label="Search filters">
     <form id="searchForm" onSubmit={submit} onReset={event=>{event.preventDefault();clear();}}>
       <label>Search text<input type="search" name="q" required minLength={2} maxLength={100}
          value={filters.q} onChange={e=>change('q',e.target.value)} autoComplete="off" aria-describedby="searchHelp"/></label>
       <p id="searchHelp" className="muted">Enter at least two characters. Matching is literal and case insensitive. Descriptions, comments, people, customer records and private repository contents are outside this search.</p>
       <div className="search-form-grid">
         <label>Record type<select name="kind" value={filters.kind} onChange={e=>change('kind',e.target.value)}>
           {searchKinds.map(k=><option key={k} value={k}>{k==='all'?'All project work':k==='project'?'Projects':k==='task'?'Tasks':'Milestones'}</option>)}
         </select></label>
         <label>Status<select name="status" value={filters.status} onChange={e=>change('status',e.target.value)}>
           <option value="">All states</option>{searchStatuses.map(s=><option value={s} key={s}>{s}</option>)}
         </select></label>
       </div>
       <details><summary>Project, customer and due date filters</summary>
         <div className="search-form-grid search-filters">
           <label>Project ID<input name="projectId" value={filters.projectId} maxLength={36}
             onChange={e=>change('projectId',e.target.value)} placeholder="Optional project UUID"/></label>
           <label>Customer organization ID<input name="organizationId" value={filters.organizationId} maxLength={36}
             onChange={e=>change('organizationId',e.target.value)} placeholder="Optional organization UUID"/></label>
           <label>Task assignee ID<input name="assigneeId" value={filters.assigneeId} maxLength={36}
             onChange={e=>change('assigneeId',e.target.value)} placeholder="Optional user UUID; choose Tasks"/></label>
           <label>Due on or after<input type="date" name="from" value={filters.from} onChange={e=>change('from',e.target.value)}/></label>
           <label>Due on or before<input type="date" name="to" value={filters.to} onChange={e=>change('to',e.target.value)}/></label>
         </div>
       </details>
       <div className="search-actions">
         <button type="submit" className="primary" disabled={busy}>{busy?'Searching…':'Search work'}</button>
         <button type="reset">Clear search</button>
       </div>
     </form>
   </section>
   <p role="status" aria-live="polite">{message}</p>
   <section ref={resultsRef} aria-label="Search results" aria-busy={busy} tabIndex={-1} className="search-results">
     {page&&<ol className="search-list">{page.results.map(item=><li key={item.kind+':'+item.id}>
       <article><p>{item.kind.toUpperCase()} · {item.project_key}</p>
         <h2><Link href={'/projects/'+item.project_id}>{item.title}</Link></h2>
         <p>{item.project_name} · {label(item.status)} · Due {item.due_on||'not set'}</p>
       </article>
     </li>)}</ol>}
   </section>
   <div className="search-actions">
     {hasLater&&<button type="button" disabled={busy} onClick={()=>void search()}>First results page</button>}
     {searched&&page?.nextCursor&&<button type="button" disabled={busy}
       onClick={()=>void search(page.nextCursor)}>Next results page</button>}
   </div>
 </main>;
}
