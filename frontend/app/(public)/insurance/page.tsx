"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Truck, Package, DollarSign, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";

// ─── Types (matching backend) ─────────────────────────────────────────────────

interface InsurancePolicy {
  id: number;
  policy_number: string;
  type: "goods_in_transit" | "device_protection";
  coverage_amount: number;
  premium_paid: number;
  status: "active" | "expired" | "claimed";
  expiry_date: string;
  order_id?: number;
  start_date: string;
  created_at: string;
}

interface Claim {
  id: number;
  claim_number: string;
  policy_id: number;
  claim_type: string;
  amount_requested: number;
  amount_approved?: number;
  status: "pending" | "approved" | "rejected";
  description: string;
  created_at: string;
  resolved_at?: string;
  rejection_reason?: string;
}

interface InsuranceProduct {
  id: number;
  type: string;
  name: string;
  description: string;
  coverage_amount: number;
  premium_amount: number;
  premium_period: string;
  duration_days: number;
  features: string[];
}

interface UserStats {
  total_policies: number;
  active_policies: number;
  total_claims: number;
  approved_claims: number;
  total_coverage: number;
  total_premiums_paid: number;
}

// ─── API Service ─────────────────────────────────────────────────────────────

const API_BASE = "/api/insurance";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function InsurancePage() {
  const { user, isAuthenticated } = useAuth();
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // Claim form state
  const [claimType, setClaimType] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [claimDescription, setClaimDescription] = useState("");

  // Device protection purchase form
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [deviceSerial, setDeviceSerial] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceModel, setDeviceModel] = useState("");

  // ── Fetch Functions ────────────────────────────────────────────────────────

  const fetchPolicies = useCallback(async () => {
    try {
      const data = await apiFetch<InsurancePolicy[]>(`${API_BASE}/policies`);
      setPolicies(data);
    } catch (err: any) {
      console.error("Failed to load policies", err);
    }
  }, []);

  const fetchClaims = useCallback(async () => {
    try {
      const data = await apiFetch<Claim[]>(`${API_BASE}/claims`);
      setClaims(data);
    } catch (err: any) {
      console.error("Failed to load claims", err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await apiFetch<InsuranceProduct[]>(`${API_BASE}/products`);
      setProducts(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load insurance products");
    }
  }, []);

  const fetchUserStats = useCallback(async () => {
    try {
      const data = await apiFetch<UserStats>(`${API_BASE}/stats`);
      setUserStats(data);
    } catch (err: any) {
      console.error("Failed to load user stats", err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPolicies(), fetchClaims(), fetchProducts(), fetchUserStats()]);
    setLoading(false);
  }, [fetchPolicies, fetchClaims, fetchProducts, fetchUserStats]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchAllData]);

  // ── Purchase Device Protection ────────────────────────────────────────────

  const purchaseDeviceProtection = async () => {
    if (!deviceSerial || !deviceBrand || !deviceModel) {
      toast.error("Please fill in all device details");
      return;
    }

    setPurchasing(true);
    try {
      await apiFetch(`${API_BASE}/policies`, {
        method: "POST",
        body: JSON.stringify({
          type: "device_protection",
          device_serial: deviceSerial,
          device_brand: deviceBrand,
          device_model: deviceModel,
        }),
      });
      toast.success("Device Protection Plan purchased successfully!");
      setShowDeviceForm(false);
      setDeviceSerial("");
      setDeviceBrand("");
      setDeviceModel("");
      await fetchAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to purchase device protection");
    } finally {
      setPurchasing(false);
    }
  };

  // ── Submit Claim ──────────────────────────────────────────────────────────

  const submitClaim = async () => {
    if (!selectedPolicy || !claimType || !claimAmount || !claimDescription) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`${API_BASE}/claims`, {
        method: "POST",
        body: JSON.stringify({
          policy_id: parseInt(selectedPolicy),
          claim_type: claimType,
          amount: parseFloat(claimAmount),
          description: claimDescription,
        }),
      });
      toast.success("Insurance claim submitted successfully!");
      setShowClaimForm(false);
      setSelectedPolicy("");
      setClaimType("");
      setClaimAmount("");
      setClaimDescription("");
      await fetchAllData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit insurance claim");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived Values ────────────────────────────────────────────────────────

  const activePolicies = policies.filter(p => p.status === "active");
  const totalClaims = userStats?.total_claims || 0;
  const totalCoverage = userStats?.total_coverage || 0;
  const totalPremiums = userStats?.total_premiums_paid || 0;

  const transitProduct = products.find(p => p.type === "goods_in_transit");
  const deviceProduct = products.find(p => p.type === "device_protection");

  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Login Required</h2>
            <p className="text-gray-600 mb-4">Please log in to access insurance services.</p>
            <button
              onClick={() => window.location.href = "/auth"}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Sign In
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
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

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Active Policies</div>
            <div className="text-2xl font-bold text-blue-600">{activePolicies.length}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Claims</div>
            <div className="text-2xl font-bold text-orange-600">{totalClaims}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Coverage</div>
            <div className="text-2xl font-bold text-green-600">KES {totalCoverage.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Premiums Paid</div>
            <div className="text-2xl font-bold text-purple-600">KES {totalPremiums.toLocaleString()}</div>
          </div>
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
                {transitProduct?.description || "Automatic coverage for every delivery, protecting against loss, damage, or theft during transit."}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Coverage:</span>
                  <span className="font-medium">KES {transitProduct?.coverage_amount?.toLocaleString() || "50,000"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Premium:</span>
                  <span className="font-medium">KES {transitProduct?.premium_amount?.toLocaleString() || "500"}/order</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">Transit period</span>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline" disabled>
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
                {deviceProduct?.description || "Extended warranty and protection for your devices against accidental damage and theft."}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Coverage:</span>
                  <span className="font-medium">KES {deviceProduct?.coverage_amount?.toLocaleString() || "100,000"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Premium:</span>
                  <span className="font-medium">KES {deviceProduct?.premium_amount?.toLocaleString() || "2,000"}/year</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">1 year</span>
                </div>
              </div>
              <Button className="w-full mt-4" onClick={() => setShowDeviceForm(true)}>
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
                No active insurance policies. Purchase a device protection plan above.
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
                        <p className="text-sm text-gray-500">Policy: {policy.policy_number}</p>
                        {policy.order_id && (
                          <p className="text-sm text-gray-600">Order #{policy.order_id}</p>
                        )}
                      </div>
                      <Badge variant={policy.status === "active" ? "default" : "secondary"}>
                        {policy.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Coverage:</span>
                        <p className="font-medium">KES {policy.coverage_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Premium:</span>
                        <p className="font-medium">KES {policy.premium_paid.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Start Date:</span>
                        <p className="font-medium">{new Date(policy.start_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Expires:</span>
                        <p className={`font-medium ${new Date(policy.expiry_date) < new Date() ? "text-red-500" : ""}`}>
                          {new Date(policy.expiry_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {policy.status === "active" && (
                      <div className="mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPolicy(policy.id.toString());
                            setShowClaimForm(true);
                          }}
                        >
                          File Claim
                        </Button>
                      </div>
                    )}
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
              <Button onClick={() => setShowClaimForm(true)} disabled={activePolicies.length === 0}>
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
                        <h3 className="font-semibold">{claim.claim_type}</h3>
                        <p className="text-sm text-gray-600">{claim.description}</p>
                        <p className="text-xs text-gray-400 mt-1">Claim #{claim.claim_number}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          claim.status === "approved" ? "default" :
                          claim.status === "pending" ? "secondary" : "destructive"
                        }>
                          {claim.status}
                        </Badge>
                        <p className="text-sm font-medium text-green-600 mt-1">
                          KES {claim.amount_requested.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Filed: {new Date(claim.created_at).toLocaleDateString()}</span>
                      {claim.resolved_at && (
                        <span>Resolved: {new Date(claim.resolved_at).toLocaleDateString()}</span>
                      )}
                      {claim.status === "approved" && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Claim approved
                        </span>
                      )}
                      {claim.status === "rejected" && claim.rejection_reason && (
                        <span className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          {claim.rejection_reason}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Protection Purchase Modal */}
        {showDeviceForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Purchase Device Protection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="deviceSerial">Device Serial Number *</Label>
                  <Input
                    id="deviceSerial"
                    placeholder="Enter device serial number"
                    value={deviceSerial}
                    onChange={(e) => setDeviceSerial(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="deviceBrand">Device Brand *</Label>
                  <Input
                    id="deviceBrand"
                    placeholder="e.g., Apple, Samsung, Dell"
                    value={deviceBrand}
                    onChange={(e) => setDeviceBrand(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="deviceModel">Device Model *</Label>
                  <Input
                    id="deviceModel"
                    placeholder="e.g., iPhone 14 Pro, Galaxy S23"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    Coverage Details
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Coverage up to KES {deviceProduct?.coverage_amount?.toLocaleString() || "100,000"}</li>
                    <li>• Annual premium: KES {deviceProduct?.premium_amount?.toLocaleString() || "2,000"}</li>
                    <li>• Covers accidental damage, theft, and defects</li>
                  </ul>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={purchaseDeviceProtection} disabled={purchasing} className="flex-1">
                    {purchasing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Purchase (KES {deviceProduct?.premium_amount?.toLocaleString() || "2,000"})
                  </Button>
                  <Button variant="outline" onClick={() => setShowDeviceForm(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
                      {activePolicies.map((policy) => (
                        <SelectItem key={policy.id} value={policy.id.toString()}>
                          {policy.type.replace("_", " ")} - KES {policy.coverage_amount.toLocaleString()}
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
                      <SelectItem value="Damage">Damage</SelectItem>
                      <SelectItem value="Loss/Theft">Loss/Theft</SelectItem>
                      <SelectItem value="Delivery Delay">Delivery Delay</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
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
                  <Button onClick={submitClaim} disabled={submitting} className="flex-1">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
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
      <Footer />
    </>
  );
}