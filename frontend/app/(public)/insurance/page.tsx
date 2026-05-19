"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Truck, Package, DollarSign, CheckCircle, AlertTriangle } from "lucide-react";

interface InsurancePolicy {
  id: string;
  type: "goods_in_transit" | "device_protection";
  coverage: number;
  premium: number;
  status: "active" | "expired" | "claimed";
  expiryDate: string;
  orderId?: string;
}

interface Claim {
  id: string;
  policyId: string;
  type: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  description: string;
  createdAt: string;
}

export default function InsurancePage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState("");

  // Claim form state
  const [claimType, setClaimType] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [claimDescription, setClaimDescription] = useState("");

  useEffect(() => {
    fetchInsuranceData();
  }, []);

  const fetchInsuranceData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      setPolicies([
        {
          id: "1",
          type: "goods_in_transit",
          coverage: 50000,
          premium: 500,
          status: "active",
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          orderId: "ORD-001",
        },
        {
          id: "2",
          type: "device_protection",
          coverage: 100000,
          premium: 2000,
          status: "active",
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);

      setClaims([
        {
          id: "1",
          policyId: "1",
          type: "Damage in transit",
          amount: 25000,
          status: "pending",
          description: "Package damaged during delivery",
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      toast.error("Failed to load insurance data");
    } finally {
      setLoading(false);
    }
  };

  const submitClaim = async () => {
    if (!selectedPolicy || !claimType || !claimAmount || !claimDescription) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch("/api/insurance/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: selectedPolicy,
          type: claimType,
          amount: parseFloat(claimAmount),
          description: claimDescription,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit claim");

      toast.success("Insurance claim submitted successfully!");
      setShowClaimForm(false);
      // Reset form
      setSelectedPolicy("");
      setClaimType("");
      setClaimAmount("");
      setClaimDescription("");
      fetchInsuranceData();
    } catch (error) {
      toast.error("Failed to submit insurance claim");
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
          <Shield className="h-8 w-8 text-blue-600" />
          NextBit Insurance
        </h1>
        <p className="text-gray-600">
          Protect your purchases with comprehensive coverage for goods in transit and device protection.
        </p>
      </div>

      {/* Insurance Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Goods-in-Transit Insurance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Automatic coverage for every delivery, protecting against loss, damage, or theft during transit.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Coverage:</span>
                <span className="font-medium">Up to KES 50,000</span>
              </div>
              <div className="flex justify-between">
                <span>Premium:</span>
                <span className="font-medium">KES 500/order</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">Transit period</span>
              </div>
            </div>
            <Button className="w-full mt-4" variant="outline">
              Included with every order
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Device Protection Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Extended warranty and protection for your devices against accidental damage and theft.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Coverage:</span>
                <span className="font-medium">Up to KES 100,000</span>
              </div>
              <div className="flex justify-between">
                <span>Premium:</span>
                <span className="font-medium">KES 2,000/year</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">1 year</span>
              </div>
            </div>
            <Button className="w-full mt-4">
              Purchase Protection
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Policies */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Insurance Policies</CardTitle>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No active insurance policies. Coverage is automatically included with your orders.
            </p>
          ) : (
            <div className="space-y-4">
              {policies.map((policy) => (
                <div key={policy.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold capitalize">
                        {policy.type.replace("_", " ")}
                      </h3>
                      {policy.orderId && (
                        <p className="text-sm text-gray-600">Order: {policy.orderId}</p>
                      )}
                    </div>
                    <Badge variant={policy.status === "active" ? "default" : "secondary"}>
                      {policy.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Coverage:</span>
                      <p className="font-medium">KES {policy.coverage.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Premium:</span>
                      <p className="font-medium">KES {policy.premium.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Expires:</span>
                      <p className="font-medium">
                        {new Date(policy.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPolicy(policy.id);
                          setShowClaimForm(true);
                        }}
                        disabled={policy.status !== "active"}
                      >
                        File Claim
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claims History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Claims History</CardTitle>
            <Button onClick={() => setShowClaimForm(true)}>
              File New Claim
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No claims filed yet.
            </p>
          ) : (
            <div className="space-y-4">
              {claims.map((claim) => (
                <div key={claim.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{claim.type}</h3>
                      <p className="text-sm text-gray-600">{claim.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        claim.status === "approved" ? "default" :
                        claim.status === "pending" ? "secondary" : "destructive"
                      }>
                        {claim.status}
                      </Badge>
                      <p className="text-sm font-medium text-green-600 mt-1">
                        KES {claim.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Filed: {new Date(claim.createdAt).toLocaleDateString()}</span>
                    {claim.status === "approved" && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Claim approved
                      </span>
                    )}
                    {claim.status === "rejected" && (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        Claim rejected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claim Form Modal */}
      {showClaimForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>File Insurance Claim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="policy">Select Policy *</Label>
                <Select value={selectedPolicy} onValueChange={setSelectedPolicy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a policy" />
                  </SelectTrigger>
                  <SelectContent>
                    {policies.filter(p => p.status === "active").map((policy) => (
                      <SelectItem key={policy.id} value={policy.id}>
                        {policy.type.replace("_", " ")} - KES {policy.coverage.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="claimType">Claim Type *</Label>
                <Select value={claimType} onValueChange={setClaimType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select claim type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="loss">Loss/Theft</SelectItem>
                    <SelectItem value="delay">Delivery Delay</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="claimAmount">Claim Amount (KES) *</Label>
                <Input
                  id="claimAmount"
                  type="number"
                  placeholder="Enter claim amount"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="claimDescription">Description *</Label>
                <textarea
                  id="claimDescription"
                  className="w-full p-2 border rounded-md"
                  rows={4}
                  placeholder="Describe the incident and damages..."
                  value={claimDescription}
                  onChange={(e) => setClaimDescription(e.target.value)}
                />
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Important Notes
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Claims must be filed within 30 days of incident</li>
                  <li>• Provide supporting documentation when possible</li>
                  <li>• Processing may take 3-5 business days</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={submitClaim} className="flex-1">
                  Submit Claim
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowClaimForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}