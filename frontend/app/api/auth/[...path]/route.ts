export const runtime = 'nodejs';
import { proxyToCatalogue } from '@/lib/proxy';

export async function GET(req: Request)    { return proxyToCatalogue(req); }
export async function POST(req: Request)   { return proxyToCatalogue(req); }
export async function PUT(req: Request)    { return proxyToCatalogue(req); }
export async function DELETE(req: Request) { return proxyToCatalogue(req); }