"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2 } from "lucide-react";
import { toast } from "sonner";

const isValidId = (id?: string | null): id is string =>
  typeof id === "string" && id.trim().length > 0 && id !== "undefined" && id !== "null";

interface RelatedLPO {
  id: string;
  reference: string;
  description: string;
  status: string;
  amount: number;
  taxAmount: number;
  currency: string;
  createdAt: string;
}

interface SupplierDetail {
  id: string;
  name: string;
  category?: string;
  status?: "preferred" | "active" | "inactive";
  email?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  lpoCount: number;
  totalSpend: number;
  relatedLPOs: RelatedLPO[];
}

const formatKES = (n: number, currency = "KES") =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupplier = async () => {
      if (!isValidId(params?.id)) {
        toast.error("Invalid supplier ID.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/b2b/suppliers/${params.id}`);
        if (!response.ok) throw new Error("Failed to load supplier");
        const data = await response.json();
        setSupplier(data);
      } catch (error) {
        toast.error("Unable to load supplier details.");
      } finally {
        setLoading(false);
      }
    };

    fetchSupplier();
  }, [params.id]);

  if (loading) {
    return <div className="container mx-auto p-6">Loading supplier...</div>;
  }

  if (!supplier) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-sm text-muted-foreground">Supplier not found.</p>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center">
              <Building2 className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{supplier.name}</h1>
              <p className="text-sm text-muted-foreground">
                {supplier.category || "Supplier profile"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{supplier.status ?? "active"}</Badge>
            <Badge variant="outline">{supplier.lpoCount} LPOs</Badge>
            <Badge variant="outline">{formatKES(supplier.totalSpend)}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button
            size="sm"
            onClick={() => router.push(`/b2b/lpos/new?company=${encodeURIComponent(supplier.name)}`)}
          >
            Apply with LPO
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-1 border border-border">
          <CardHeader>
            <CardTitle>Supplier Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p>{supplier.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p>{supplier.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p>{supplier.address || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Joined</p>
              <p>{supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString() : "—"}</p>
            </div>
          </CardContent>
        </Card>

        <div className="xl:col-span-2 grid grid-cols-1 gap-4">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle>Recent Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {supplier.relatedLPOs.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No related LPOs yet. Start a procurement request to this supplier.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplier.relatedLPOs.map((lpo) => (
                        <TableRow key={lpo.id}>
                          <TableCell>{lpo.reference}</TableCell>
                          <TableCell className="max-w-xs truncate">{lpo.description}</TableCell>
                          <TableCell>{lpo.status}</TableCell>
                          <TableCell>{formatKES(lpo.amount + lpo.taxAmount, lpo.currency)}</TableCell>
                          <TableCell>{new Date(lpo.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {isValidId(lpo.id) ? (
                              <Link href={`/b2b/lpos/${lpo.id}`}>
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </Link>
                            ) : (
                              <Button variant="outline" size="sm" disabled>
                                View
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Supplier Statement</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Supplier activity by LPO count and spend.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use this view to decide which suppliers to apply purchase orders with.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push(`/b2b/lpos/new?company=${encodeURIComponent(supplier.name)}`)}>
              Raise LPO
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
