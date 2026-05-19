import { DiagResult } from "@/types/probe";

interface DiagnosticGridProps {
  diagnostics: DiagResult;
}

export default function DiagnosticGrid({ diagnostics }: DiagnosticGridProps) {
  const panels = [
    { key: "battery", title: "Battery", data: diagnostics.battery },
    { key: "gpu", title: "GPU", data: diagnostics.gpu },
    { key: "disks", title: "Disk", data: diagnostics.disks },
    { key: "cpu_throttle", title: "CPU", data: diagnostics.cpu_throttle },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {panels.map(panel => (
        <div key={panel.key} className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">{panel.title}</h3>
          {panel.data ? (
            <pre className="text-sm text-gray-600 whitespace-pre-wrap">
              {JSON.stringify(panel.data, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </div>
      ))}
    </div>
  );
}