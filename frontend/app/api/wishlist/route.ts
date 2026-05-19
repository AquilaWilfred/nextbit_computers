export const runtime='nodejs';
import{proxyToCatalogue}from '@/lib/proxy';
export async function GET(r:Request){return proxyToCatalogue(r);}
export async function POST(r:Request){return proxyToCatalogue(r);}
