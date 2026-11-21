import type {Metadata} from 'next';
import {notFound,redirect} from 'next/navigation';
import {AppHomeWorkspace} from '@/features/auth/AppHomeWorkspace';
import '../../../app-home-live.css';
export const metadata:Metadata={title:'Application workspace | VSPH',robots:{index:false,follow:false}};
export default async function ApplicationHome({params}:{params:Promise<{app:string}>}){
 const {app}=await params,code=app.toUpperCase();
 if(!/^[A-Z][A-Z0-9_]{1,39}$/.test(code))notFound();
 if(code==='OUTREACH')redirect('/apps/outreach/launch');
 return <AppHomeWorkspace key={code} code={code}/>;
}
