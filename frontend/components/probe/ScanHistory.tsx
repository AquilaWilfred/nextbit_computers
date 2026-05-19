import { Scan } from "@/types/probe";

interface ScanHistoryProps {
  scans: Scan[];
}

export default function ScanHistory({ scans }: ScanHistoryProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Scan History</h3>
      <div className="space-y-2">
        {scans.map(scan => (
          <div key={scan.id} className="flex justify-between items-center p-2 border rounded">
            <div>
              <p className="font-medium">{scan.scan_id}</p>
              <p className="text-sm text-gray-500">{new Date(scan.created_at).toLocaleString()}</p>
            </div>
            <a href={`/devices/${scan.device_id}/scans/${scan.scan_id}`} className="text-blue-600 hover:underline">
              View
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}