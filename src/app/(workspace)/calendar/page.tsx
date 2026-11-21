import type {Metadata} from 'next';
import {LiveCalendar} from '@/features/calendar/LiveCalendar';
import '../calendar-live.css';
export const metadata:Metadata={title:'Calendar | VSPH Control Center',robots:{index:false,follow:false}};
export default function CalendarPage(){return <main className="workspace-content calendar-live-page" id="mainContent" tabIndex={-1}>
  <LiveCalendar/>
</main>;}
