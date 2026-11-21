'use client';
import Link from 'next/link';
import {useRef,useState,type FormEvent} from 'react';
import type {OrgSummary,OrgDetail,OrgMember,OrgInvite} from './OrganizationContract';
const path=(org:string,after?:string,memberAfter?:string)=>{
 const params=new URLSearchParams({org});if(after)params.set('afterId',after);
 if(memberAfter)params.set('memberAfter',memberAfter);
 return '/organizations?'+params.toString();
};
function MemberCard({member,current,mutate,busy}:{
 member:OrgMember;current:OrgDetail;
 mutate:(action:Record<string,unknown>)=>Promise<void>;busy:boolean;
}){
 const [role,setRole]=useState(member.role);
 const [status,setStatus]=useState(member.status);
 const [confirming,setConfirming]=useState(false);
 const [access,setAccess]=useState<Record<string,string>>({});
 const [confirmProduct,setConfirmProduct]=useState<string|null>(null);
 return <article className="org-member" aria-label={'Member '+member.full_name}>
   <h3>{member.full_name}</h3>
   <p>{member.email} · {member.role} · {member.status} · account {member.account_status}</p>
   {member.manageable&&member.status!=='invited'&&<>
    <div className="org-grid">
     <label>Organization role for {member.email}
       <select value={role} onChange={e=>{setRole(e.target.value);setConfirming(false);}}>
        {(current.actorRole==='owner'?['admin','member','viewer']:['member','viewer'])
          .map(x=><option key={x} value={x}>{x}</option>)}
       </select>
     </label>
     <label>Membership status for {member.email}
       <select value={status} onChange={e=>{setStatus(e.target.value);setConfirming(false);}}>
         {['active','suspended'].map(x=><option key={x}>{x}</option>)}
       </select>
     </label>
    </div>
    {confirming?<div className="org-actions">
       <p>Confirm {member.email}: {role}, {status}. Existing product sessions will be revoked.</p>
       <button type="button" disabled={busy} onClick={()=>void mutate({action:'member',
         userId:member.user_id,version:member.version,role,status,confirmed:true})}>Confirm membership change</button>
       <button type="button" disabled={busy} onClick={()=>setConfirming(false)}>Cancel</button>
     </div>:<button type="button" disabled={busy||role===member.role&&status===member.status}
        onClick={()=>setConfirming(true)}>Review membership change</button>}
    {member.status==='active'&&current.products.filter(p=>p.effective&&p.can_assign).map(p=>{
      const original=member.product_roles.find(r=>r.applicationId===p.id)?.role||'';
      if(original==='super_admin')return null;
      const value=access[p.id]??original;
      return <div key={p.id} className="org-product-role">
       <label>{p.name} role for {member.email}
        <select value={value} onChange={e=>{setAccess(prev=>({...prev,[p.id]:e.target.value}));setConfirmProduct(null);}}>
         <option value="">Remove product access</option>{p.roles.filter(role=>role!=='super_admin')
            .map(x=><option key={x} value={x}>{x}</option>)}
        </select>
       </label>
       {confirmProduct===p.id?<div className="org-actions">
         <p>Confirm {p.name} access change for {member.email}. Sessions will be revoked.</p>
         <button type="button" disabled={busy} onClick={()=>void mutate({action:'role',
           userId:member.user_id,version:member.version,applicationId:p.id,role:value,confirmed:true})}>Confirm access change</button>
         <button type="button" onClick={()=>setConfirmProduct(null)}>Cancel</button>
       </div>:<button type="button" disabled={busy||value===original}
         onClick={()=>setConfirmProduct(p.id)}>Review {p.name} access</button>}
      </div>;
    })}
   </>}
   <p>{member.product_roles.length?member.product_roles.map(p=>
      (current.products.find(x=>x.id===p.applicationId)?.name||'Assigned product')+': '+p.role).join(' · '):
       'No individual product roles.'}</p>
 </article>;
}
export function OrganizationWorkspace({organizations,current,members,invitations,
 organizationAfter,memberAfter}:{organizations:OrgSummary[];current:OrgDetail;
  members:OrgMember[];invitations:OrgInvite[];organizationAfter:string;memberAfter:string;}){
 const [name,setName]=useState(current.organization.name);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [confirmName,setConfirmName]=useState(false);
 const [invite,setInvite]=useState({name:'',email:'',memberRole:'member'});
 const [inviteRoles,setInviteRoles]=useState<Record<string,string>>({});
 const [inviteConfirm,setInviteConfirm]=useState(false);
 const [confirmInvitation,setConfirmInvitation]=useState<string|null>(null);
 const pendingInvite=useRef<{signature:string;key:string}|null>(null);
 async function mutate(body:Record<string,unknown>,invitation=false){
   if(busy)return;
   setBusy(true);setMessage('Submitting organization change…');
   const payload={organizationId:current.organization.id,...body};
   const signature=JSON.stringify(payload);
   if(invitation&&pendingInvite.current?.signature!==signature)
     pendingInvite.current={signature,key:crypto.randomUUID()};
   try{
     const response=await fetch('/api/organization-command',{
       method:'POST',credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json',...(invitation?{'Idempotency-Key':pendingInvite.current!.key}:{})},
       body:JSON.stringify(payload),
     });
     if(response.status===401){window.location.assign('/login');return;}
     const data:unknown=await response.json().catch(()=>null);
     if(!response.ok)throw Error(data&&typeof data==='object'&&'message' in data&&typeof data.message==='string'?
       data.message:'Organization change not confirmed. Review the current records before retrying.');
     pendingInvite.current=null;
     window.location.reload();
   }catch(e){setMessage(e instanceof Error?e.message:'Organization change unavailable.');}
   finally{setBusy(false);}
 }
 const createInvite=(e:FormEvent<HTMLFormElement>)=>{
   e.preventDefault();
   if(!inviteConfirm){setInviteConfirm(true);return;}
   const products=current.products.filter(p=>p.effective&&p.can_assign&&inviteRoles[p.id])
     .map(p=>({applicationId:p.id,role:inviteRoles[p.id]}));
   void mutate({action:'invite',...invite,products},true);
 };
 const nextAfter=organizations.length===100?organizations[99].id:null;
 const nextMember=members.length===50?members[49].user_id:null;
 return <main className="workspace-content org-live" id="mainContent" tabIndex={-1}>
  <header><h1>My organizations</h1><Link href={path(current.organization.id)}>Refresh</Link></header>
  {message&&<p role="alert" className="org-feedback">{message}</p>}
  <label className="org-select">Organization
    <select value={current.organization.id} onChange={e=>window.location.assign(path(e.target.value))}>
     {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
     {!organizations.some(o=>o.id===current.organization.id)&&
       <option value={current.organization.id}>{current.organization.name}</option>}
    </select>
  </label>
  <div className="org-actions">
   {organizationAfter&&<Link href="/organizations">First organizations page</Link>}
   {nextAfter&&<Link href={path(current.organization.id,nextAfter)}>Next organizations page</Link>}
  </div>
  <section className="org-panel">
   <h2>{current.organization.name}</h2>
   <p>{current.organization.slug} · {current.organization.status} · your role: {current.actorRole}</p>
   <p>{current.counts.activeMembers} active · {current.counts.invitedMembers} invited · {current.counts.suspendedMembers} suspended members</p>
   <form onSubmit={e=>{e.preventDefault();if(confirmName)
       void mutate({action:'profile',version:current.organization.version,name});
     else setConfirmName(true);}}>
    <label>Organization display name<input required maxLength={150} value={name}
      onChange={e=>{setName(e.target.value);setConfirmName(false);}} autoComplete="organization"/></label>
    {confirmName&&<p>Confirm the organization display name change.</p>}
    <button type="submit" disabled={busy||name===current.organization.name}>{confirmName?'Confirm name change':'Save organization name'}</button>
   </form>
   <p>The organization identifier and subscription terms are managed by VSPH. Project assignments do not grant product access.</p>
  </section>
  <section className="org-panel"><h2>Subscribed products</h2>
   <p>Subscription terms describe access, not payments or revenue. Product access requires an explicit assigned role.</p>
   {current.products.map(p=><article key={p.id} className="org-product">
     <h3>{p.name}</h3><p>{p.code} · {p.status} · access {p.access_status} · {p.subscription_status||'no subscription'} · {p.plan_code||'no plan'}</p>
     <p>From {p.starts_at||'not set'} to {p.ends_at||'no end date'}. {p.effective?'Currently effective.':'Currently unavailable.'}</p>
     {!p.can_assign&&<p>Assigning product roles requires your own explicit product administrator role.</p>}
   </article>)}
   {!current.products.length&&<p>No products are assigned to this organization.</p>}
   {current.productCount>100&&<p>Showing the first 100 products. Contact VSPH for the complete entitlement directory.</p>}
  </section>
  <section className="org-panel"><h2>Members and access</h2>
    <p>Owners manage administrators and ordinary members. Administrators manage ordinary members. Owner changes use the separate transfer workflow. Self and platform-account edits are unavailable here. Invited members must accept their invitation.</p>
    {members.map(m=><MemberCard key={m.user_id} member={m} current={current} busy={busy}
       mutate={action=>mutate(action)}/>)}
    {!members.length&&<p>No members on this page.</p>}
    <div className="org-actions">{memberAfter&&<Link href={path(current.organization.id,organizationAfter)}>
      First members page</Link>}
      {nextMember&&<Link href={path(current.organization.id,organizationAfter,nextMember)}>Next members page</Link>}</div>
  </section>
  <section className="org-panel"><h2>Invite a team member</h2>
    <p>Access starts only after the recipient accepts. Sending email requires the separately configured invitation worker.</p>
    <form onSubmit={createInvite} onChange={()=>{pendingInvite.current=null;setInviteConfirm(false);}}>
     <div className="org-grid">
      <label>Invitee name<input required maxLength={150} autoComplete="name" value={invite.name}
        onChange={e=>setInvite(v=>({...v,name:e.target.value}))}/></label>
      <label>Invitee email<input required type="email" maxLength={190} autoComplete="email" value={invite.email}
        onChange={e=>setInvite(v=>({...v,email:e.target.value}))}/></label>
      <label>Invitation organization role<select value={invite.memberRole}
        onChange={e=>setInvite(v=>({...v,memberRole:e.target.value}))}>
        {(current.actorRole==='owner'?['member','viewer','admin']:['member','viewer'])
          .map(x=><option key={x}>{x}</option>)}
      </select></label>
     </div>
     <fieldset><legend>Optional product roles</legend><div className="org-grid">
       {current.products.filter(p=>p.effective&&p.can_assign).map(p=>
        <label key={p.id}>Invitation {p.name} role
         <select value={inviteRoles[p.id]||''} onChange={e=>setInviteRoles(v=>({...v,[p.id]:e.target.value}))}>
          <option value="">No product role</option>{p.roles.filter(x=>x!=='super_admin')
             .map(x=><option key={x}>{x}</option>)}
         </select></label>)}
     </div></fieldset>
     {inviteConfirm&&<p role="status">Confirm this invitation. It will be queued for delivery, not immediately accepted.</p>}
     <button type="submit" disabled={busy}>{inviteConfirm?'Confirm invitation':'Queue team invitation'}</button>
    </form>
  </section>
  <section className="org-panel"><h2>Your invitations</h2>
   <p>Latest 100 invitations issued by your account for this organization. VSPH handles ambiguous identity failures and invitations issued by other administrators.</p>
   {invitations.map(i=><article key={i.id} className="org-product"><h3>{i.email}</h3>
     <p>{i.state}{i.expired?' (expired)':''} · delivery {i.delivery_state} · attempts {i.attempts} · expires {i.expires_at}</p>
     {i.failure_code&&<p>Delivery requires review: {i.failure_code}</p>}
     {!['accepted','accepting','requires_attention'].includes(i.state)?
      <div className="org-actions">
        {(['reissue-invite','cancel-invite'] as const).map(action=><div key={action}>
          {confirmInvitation===action+':'+i.id?
           <><p>Previous invitation links will stop working.</p>
            <button type="button" disabled={busy} onClick={()=>void mutate({action,
              invitationId:i.id,generation:i.generation,confirmed:true})}>Confirm {action==='reissue-invite'?'reissue':'cancellation'}</button>
            <button type="button" onClick={()=>setConfirmInvitation(null)}>Keep invitation</button></>:
           <button type="button" disabled={busy} onClick={()=>setConfirmInvitation(action+':'+i.id)}>
             {action==='reissue-invite'?'Reissue':'Cancel'} {i.email}</button>}
        </div>)}
      </div>:<p>Accepted or ambiguous invitations cannot be changed here. Contact VSPH for recovery.</p>}
   </article>)}
   {!invitations.length&&<p>No invitations issued by you for this organization.</p>}
  </section>
  {current.actorRole==='owner'&&<section className="org-panel">
   <h2>Transfer organization ownership</h2>
   <p>Ownership transfer requires a fresh password/MFA step-up and a reviewed server-side proof. It is not available through the current migrated interface.</p>
  </section>}
  <section className="org-panel"><h2>Recent organization changes</h2>
    {current.activity.map((a,i)=><p key={a.action+':'+i}>{a.created_at} · {a.action}</p>)}
    {!current.activity.length&&<p>No organization workspace changes recorded.</p>}
  </section>
 </main>;
}
