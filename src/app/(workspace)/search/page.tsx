import type {Metadata} from 'next';
import {LiveSearch} from '@/features/search/LiveSearch';
import '../search-live.css';
export const metadata:Metadata={title:'Search project work | VSPH',robots:{index:false,follow:false}};
export default function SearchPage(){return <LiveSearch/>;}
