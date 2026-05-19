import { NextResponse } from "next/server";

// GET /api/admin/network
// Returns federated network summary for the dashboard
export async function GET() {
  // TODO: replace with real DB queries from catalogue service
  // Shape expected by the frontend:
  // {
  //   totalStores: number,
  //   activeInNetwork: number,
  //   pendingRequests: number,
  //   interStoreTransfers: number,
  //   totalNetworkStock: number,
  //   conflictFlags: number,
  // }

  // Stub — swap this fetch for your catalogue backend call
  try {
    const upstream = await fetch(
      `${process.env.CATALOGUE_URL ?? "http://localhost:8000"}/network/summary`,
      { next: { revalidate: 30 } }
    );
    if (upstream.ok) {
      const data = await upstream.json();
      return NextResponse.json(data);
    }
  } catch {
    // fall through to empty stub
  }

  return NextResponse.json({
    totalStores: 0,
    activeInNetwork: 0,
    pendingRequests: 0,
    interStoreTransfers: 0,
    totalNetworkStock: 0,
    conflictFlags: 0,
  });
}