"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Invoice {
  id: string;
  reference: string;
  lpoReference: string;
  company: string;
  amount: number;
  taxAmount: number;
  currency: string;
  status: string;
  dueDate: string;
  createdAt: string;
  paymentMethod?: string;
  paymentReference?: string;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/b2b/invoices/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch invoice");
      const data = await response.json();
      setInvoice(data);
    } catch (error) {
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/b2b/invoices/${params.id}/pdf`);
      if (!response.ok) throw new Error("Failed to download PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoice?.reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error("Failed to download PDF");
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!invoice) {
    return <div className="container mx-auto p-6">Invoice not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Invoice {invoice.reference}</h1>
        <Button onClick={handleDownloadPDF}>Download PDF</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                {invoice.status}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium">LPO Reference</label>
              <p>{invoice.lpoReference}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Company</label>
              <p>{invoice.company}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Amount</label>
              <p>{invoice.currency} {invoice.amount.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Tax</label>
              <p>{invoice.currency} {invoice.taxAmount.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Total</label>
              <p className="font-bold">{invoice.currency} {(invoice.amount + invoice.taxAmount).toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <p>{new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Created</label>
              <p>{new Date(invoice.createdAt).toLocaleString()}</p>
            </div>
            {invoice.paymentMethod && (
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <p>{invoice.paymentMethod}</p>
              </div>
            )}
            {invoice.paymentReference && (
              <div>
                <label className="text-sm font-medium">Payment Reference</label>
                <p>{invoice.paymentReference}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Bank Details</label>
                <div className="text-sm text-gray-600">
                  <p>Bank: KCB Bank Kenya</p>
                  <p>Account Name: NextBit Technologies Ltd</p>
                  <p>Account Number: 1234567890</p>
                  <p>Branch: Westlands</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Payment Instructions</label>
                <p className="text-sm text-gray-600">
                  Please include the invoice reference ({invoice.reference}) in your payment description.
                  Payments are processed within 24 hours of receipt.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}