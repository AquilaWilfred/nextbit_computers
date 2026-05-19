"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const isValidLpoId = (id?: string | null): id is string =>
  typeof id === "string" && id.trim().length > 0 && id !== "undefined" && id !== "null";

interface LPO {
  id: string;
  reference: string;
  company: string;
  description: string;
  amount: number;
  taxAmount: number;
  currency: string;
  status: string;
  itemCount: number;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

interface AuditLog {
  id: number;
  action: string;
  userId: string;
  timestamp: string;
  notes?: string;
}

export default function LPODetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lpo, setLpo] = useState<LPO | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isValidLpoId(params?.id)) return;
    fetchLPO();
  }, [params?.id]);

  const fetchLPO = async () => {
    if (!isValidLpoId(params?.id)) return;
    try {
      const response = await fetch(`/api/b2b/lpos/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch LPO");
      const data = await response.json();
      setLpo(data);
      setAuditLogs(data.auditLogs || []);
    } catch (error) {
      toast.error("Failed to load LPO");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isValidLpoId(params?.id)) return;
    try {
      const response = await fetch(`/api/b2b/lpos/${params.id}/soft-lock`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to submit LPO");
      toast.success("LPO submitted for approval!");
      fetchLPO();
    } catch (error) {
      toast.error("Failed to submit LPO");
    }
  };

  const handleApprove = async () => {
    if (!isValidLpoId(params?.id)) return;
    try {
      const response = await fetch(`/api/b2b/lpos/${params.id}/approve`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to approve LPO");
      const data = await response.json();
      toast.success("LPO approved and invoice generated!");
      router.push(`/b2b/invoices/${data.invoiceId}`);
    } catch (error) {
      toast.error("Failed to approve LPO");
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!isValidLpoId(params?.id)) {
    return <div className="container mx-auto p-6">Invalid LPO ID.</div>;
  }

  if (!lpo) {
    return <div className="container mx-auto p-6">LPO not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">LPO {lpo.reference}</h1>
        <div className="flex gap-2">
          {lpo.status === "draft" && (
            <Button onClick={handleSubmit}>Submit for Approval</Button>
          )}
          {lpo.status === "submitted" && (
            <Button onClick={handleApprove}>Approve & Generate Invoice</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>LPO Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Badge variant={lpo.status === "approved" ? "default" : "secondary"}>
                {lpo.status}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium">Company</label>
              <p>{lpo.company}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <p>{lpo.description}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Amount</label>
              <p>{lpo.currency} {lpo.amount.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Tax</label>
              <p>{lpo.currency} {lpo.taxAmount.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Total</label>
              <p className="font-bold">{lpo.currency} {(lpo.amount + lpo.taxAmount).toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <p>{new Date(lpo.dueDate).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Created</label>
              <p>{new Date(lpo.createdAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="border-l-2 border-gray-200 pl-4">
                  <p className="text-sm font-medium">{log.action}</p>
                  <p className="text-xs text-gray-500">
                    {log.userId} • {new Date(log.timestamp).toLocaleString()}
                  </p>
                  {log.notes && <p className="text-sm">{log.notes}</p>}
                </div>
              ))}
              {auditLogs.length === 0 && (
                <p className="text-sm text-gray-500">No audit logs yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}