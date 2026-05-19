"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Activity, Cpu, HardDrive, Battery, Wifi, Monitor,
  CheckCircle, AlertTriangle, XCircle, Download,
  RefreshCw, Shield, Zap
} from "lucide-react";

interface DiagnosticResult {
  id: string;
  category: string;
  test: string;
  status: "pass" | "fail" | "warning";
  score: number;
  details: string;
  timestamp: string;
}

interface DeviceHealth {
  overall: number;
  categories: {
    hardware: number;
    software: number;
    network: number;
    security: number;
  };
}

export default function DiagnosticsPage() {
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [deviceHealth, setDeviceHealth] = useState<DeviceHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const fetchDiagnostics = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      setDiagnosticResults([
        {
          id: "1",
          category: "Hardware",
          test: "CPU Stress Test",
          status: "pass",
          score: 95,
          details: "CPU performed well under load, no throttling detected",
          timestamp: new Date().toISOString(),
        },
        {
          id: "2",
          category: "Hardware",
          test: "RAM Stability",
          status: "pass",
          score: 98,
          details: "Memory modules functioning optimally",
          timestamp: new Date().toISOString(),
        },
        {
          id: "3",
          category: "Hardware",
          test: "Disk Health",
          status: "warning",
          score: 75,
          details: "SSD showing some wear, consider backup",
          timestamp: new Date().toISOString(),
        },
        {
          id: "4",
          category: "Network",
          test: "Connectivity",
          status: "pass",
          score: 92,
          details: "Stable internet connection detected",
          timestamp: new Date().toISOString(),
        },
        {
          id: "5",
          category: "Security",
          test: "Antivirus Status",
          status: "pass",
          score: 100,
          details: "Security software up to date",
          timestamp: new Date().toISOString(),
        },
      ]);

      setDeviceHealth({
        overall: 88,
        categories: {
          hardware: 89,
          software: 95,
          network: 92,
          security: 100,
        },
      });
    } catch (error) {
      toast.error("Failed to load diagnostics");
    } finally {
      setLoading(false);
    }
  };

  const runFullDiagnostics = async () => {
    setRunningDiagnostics(true);
    try {
      const response = await fetch("/api/diagnostics/run", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to run diagnostics");

      toast.success("Diagnostics completed successfully!");
      fetchDiagnostics();
    } catch (error) {
      toast.error("Failed to run diagnostics");
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const downloadReport = async () => {
    try {
      const response = await fetch("/api/diagnostics/report");
      if (!response.ok) throw new Error("Failed to download report");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nextbit-diagnostics-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error("Failed to download report");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "fail":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pass":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "fail":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <Activity className="h-8 w-8 text-blue-600" />
          Device Diagnostics
        </h1>
        <p className="text-gray-600">
          Comprehensive hardware and software diagnostics for your devices.
        </p>
      </div>

      {/* Overall Health Score */}
      {deviceHealth && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Device Health Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {deviceHealth.overall}%
                </div>
                <div className="text-sm text-gray-600">Overall Health</div>
                <Progress value={deviceHealth.overall} className="mt-2" />
              </div>

              <div className="text-center">
                <Cpu className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <div className="text-xl font-semibold">{deviceHealth.categories.hardware}%</div>
                <div className="text-sm text-gray-600">Hardware</div>
              </div>

              <div className="text-center">
                <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-xl font-semibold">{deviceHealth.categories.software}%</div>
                <div className="text-sm text-gray-600">Software</div>
              </div>

              <div className="text-center">
                <Wifi className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <div className="text-xl font-semibold">{deviceHealth.categories.network}%</div>
                <div className="text-sm text-gray-600">Network</div>
              </div>

              <div className="text-center">
                <Zap className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <div className="text-xl font-semibold">{deviceHealth.categories.security}%</div>
                <div className="text-sm text-gray-600">Security</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <Button
          onClick={runFullDiagnostics}
          disabled={runningDiagnostics}
          className="flex items-center gap-2"
        >
          {runningDiagnostics ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Activity className="h-4 w-4" />
          )}
          {runningDiagnostics ? "Running Diagnostics..." : "Run Full Diagnostics"}
        </Button>

        <Button
          variant="outline"
          onClick={downloadReport}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download Report
        </Button>
      </div>

      {/* Diagnostic Results */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {diagnosticResults.map((result) => (
              <div key={result.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <h3 className="font-semibold">{result.test}</h3>
                      <p className="text-sm text-gray-600">{result.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      result.status === "pass" ? "default" :
                      result.status === "warning" ? "secondary" : "destructive"
                    }>
                      {result.status.toUpperCase()}
                    </Badge>
                    <div className="text-sm text-gray-500 mt-1">
                      Score: {result.score}%
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-2">{result.details}</p>

                <div className="flex items-center justify-between">
                  <Progress value={result.score} className="flex-1 mr-4" />
                  <span className="text-xs text-gray-500">
                    {new Date(result.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}