import { ledger } from '@/lib/ledger';
import { notFound } from 'next/navigation';
import { Checkout } from '@/components/checkout';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const metadata={title:'Secure payment · PayTrace',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Tracking({params}:{params:Promise<{token:string}>}){const {token}=await params;const row=(await ledger().tracking(token));if(!row)notFound();return <Checkout initial={row} token={token}/>;}
