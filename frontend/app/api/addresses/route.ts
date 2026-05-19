export const runtime="nodejs";
import{proxyToCatalogue}from "@/lib/proxy";
export async function GET(r:Request){return proxyToCatalogue(r);}
export async function POST(r:Request){return proxyToCatalogue(r);}
export async function PUT(r:Request){return proxyToCatalogue(r);}
export async function PATCH(r:Request){return proxyToCatalogue(r);}
export async function DELETE(r:Request){return proxyToCatalogue(r);}
