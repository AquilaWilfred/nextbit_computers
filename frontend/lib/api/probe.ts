import { Device, Scan } from "@/types/probe";

export async function getDevice(id: string): Promise<Device> {
  const res = await fetch(`/api/devices/${id}`);
  if (!res.ok) throw new Error("Failed to fetch device");
  return res.json();
}

export async function getScan(deviceId: string, scanId: string): Promise<Scan> {
  const res = await fetch(`/api/devices/${deviceId}/scans/${scanId}`);
  if (!res.ok) throw new Error("Failed to fetch scan");
  return res.json();
}

export async function getDeviceScans(deviceId: string): Promise<Scan[]> {
  const res = await fetch(`/api/devices/${deviceId}/scans`);
  if (!res.ok) throw new Error("Failed to fetch scans");
  return res.json();
}