import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {portalApi} from '@/features/workspace/server-api';
import {parseMusicLaunch} from '@/features/music/MusicLaunchContract';
import {MusicLaunchWorkspace} from '@/features/music/MusicLaunchWorkspace';
import '../../../music-launch.css';
export const metadata:Metadata={title:'Open Music | VSPH',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function MusicLaunchPage(){
 const data=await portalApi('/api/sso/config/MUSIC');
 if(data.kind==='unauthorized')redirect('/login');
 const config=data.kind==='ok'?parseMusicLaunch(data.value,process.env.MUSIC_SSO_START_URL):null;
 if(!config)return <main className="workspace-content music-launch" id="mainContent">
    <section className="music-launch-card">
      <h1>Music launch unavailable</h1>
      <p role="alert">Your Music access or the trusted server-owned integration
        could not be verified. No application sign-in has been started.</p>
      <Link href="/applications">Back to applications</Link>
    </section>
 </main>;
 return <MusicLaunchWorkspace config={config}/>;
}
