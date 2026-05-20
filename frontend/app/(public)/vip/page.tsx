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
import { Crown, Plane, Truck, Headphones, Star, CheckCircle, Gift, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";

// ─────────────────── Types (matching backend) ───────────────────

interface VIPService {
  id: number;
  name: string;
  description: string;
  features: string[];
  category: "shipping" | "support" | "concierge" | "exclusive";
  pricing_type: "one-time" | "subscription";
  pricing_amount: number;
  pricing_currency: string;
  pricing_period?: string;
}

interface VIPMembership {
  id: number;
  tier: "gold" | "platinum" | "diamond";
  status: "active" | "inactive" | "pending";
  joinedAt: string;
  expiresAt: string;
  autoRenewal: boolean;
  benefits: string[];
  totalSpent: number;
  servicesPurchased: number;
}

interface ShipmentCalculation {
  cost: number;
  currency: string;
  estimatedDelivery: string;
}

// ─────────────────── API Service ───────────────────

const API_BASE = "/api/vip";

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

// ─────────────────── Helpers ───────────────────

const TIER_DISPLAY: Record<string, { label: string; color: string; price: number }> = {
  gold: { label: "Gold", color: "text-yellow-600", price: 2500 },
  platinum: { label: "Platinum", color: "text-blue-600", price: 7500 },
  diamond: { label: "Diamond", color: "text-purple-600", price: 15000 },
};

// ─────────────────── Main Page ───────────────────

export default function VIPPage() {
  const { user } = useAuth();
  const [vipServices, setVipServices] = useState<VIPService[]>([]);
  const [membership, setMembership] = useState<VIPMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"gold" | "platinum" | "diamond">("gold");
  const [upgrading, setUpgrading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  
  // Shipping calculator states
  const [destination, setDestination] = useState("");
  const [weight, setWeight] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  const [calculatedCost, setCalculatedCost] = useState<ShipmentCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Fetch all data
  const fetchMembership = useCallback(async () => {
    try {
      const data = await apiFetch<any>(`${API_BASE}/membership`);

      // Normalize backend snake_case response to frontend camelCase shape
      const mapped: VIPMembership = {
        id: data.id,
        tier: data.tier,
        status: data.status,
        joinedAt: data.joined_at ?? data.joinedAt,
        expiresAt: data.expires_at ?? data.expiresAt,
        autoRenewal: data.auto_renewal ?? data.autoRenewal ?? false,
        benefits: data.benefits ?? [],
        totalSpent: data.total_spent ?? data.totalSpent ?? 0,
        servicesPurchased: data.services_purchased ?? data.servicesPurchased ?? 0,
      };

      setMembership(mapped);
    } catch (err: any) {
      console.error("Failed to load membership", err);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const data = await apiFetch<VIPService[]>(`${API_BASE}/services`);
      setVipServices(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load VIP services");
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMembership(), fetchServices()]);
    setLoading(false);
  }, [fetchMembership, fetchServices]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Upgrade membership
  const upgradeMembership = async () => {
    setUpgrading(true);
    try {
      await apiFetch(`${API_BASE}/membership/upgrade`, {
        method: "POST",
        body: JSON.stringify({ tier: selectedTier }),
      });
      toast.success(`Successfully upgraded to ${selectedTier.toUpperCase()} membership!`);
      setShowUpgradeForm(false);
      await fetchMembership();
    } catch (err: any) {
      toast.error(err.message || "Failed to upgrade membership");
    } finally {
      setUpgrading(false);
    }
  };

  // Purchase service
  const purchaseService = async (serviceId: number) => {
    setPurchasing(String(serviceId));
    try {
      await apiFetch(`${API_BASE}/services/purchase`, {
        method: "POST",
        body: JSON.stringify({ service_id: serviceId }),
      });
      toast.success("Service purchased successfully!");
      await fetchMembership(); // Refresh membership stats
    } catch (err: any) {
      toast.error(err.message || "Failed to purchase service");
    } finally {
      setPurchasing(null);
    }
  };

  // Calculate shipping cost
  const calculateShippingCost = async () => {
    if (!destination || !weight || !declaredValue) {
      toast.error("Please fill in all shipping calculator fields");
      return;
    }

    setCalculating(true);
    try {
      const data = await apiFetch<ShipmentCalculation>(`${API_BASE}/shipments/calculate`, {
        method: "POST",
        body: JSON.stringify({
          type: destination === "international" ? "international" : "express",
          destination: destination,
          weight: parseFloat(weight),
          declared_value: parseFloat(declaredValue),
        }),
      });
      setCalculatedCost(data);
      toast.success(`Estimated cost: ${data.currency} ${data.cost.toLocaleString()}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to calculate shipping cost");
    } finally {
      setCalculating(false);
    }
  };

  // Create shipment request
  const createShipmentRequest = async () => {
    if (!destination || !weight || !declaredValue) {
      toast.error("Please fill in all fields");
      return;
    }

    setCalculating(true);
    try {
      await apiFetch(`${API_BASE}/shipments`, {
        method: "POST",
        body: JSON.stringify({
          type: "international",
          destination: destination,
          weight: parseFloat(weight),
          declared_value: parseFloat(declaredValue),
        }),
      });
      toast.success("Shipment request created! You will receive tracking information soon.");
      setDestination("");
      setWeight("");
      setDeclaredValue("");
      setCalculatedCost(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to create shipment request");
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-yellow-600" />
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
            <Crown className="h-8 w-8 text-yellow-600" />
            NextBit VIP & International Trade
          </h1>
          <p className="text-gray-600">
            Exclusive services for our most valued customers. Enjoy priority shipping, dedicated support, and early access to products.
          </p>
        </div>

        {/* Current Membership */}
        {membership && (
          <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-600" />
                    Current Membership: {TIER_DISPLAY[membership.tier]?.label || membership.tier}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Member since {new Date(membership.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={membership.status === "active" ? "default" : "secondary"}>
                  {membership.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Your Benefits</h4>
                  <ul className="space-y-1">
                    {membership.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Membership Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Expires:</span>
                      <span>{new Date(membership.expiresAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Auto-renewal:</span>
                      <span>{membership.autoRenewal ? "Enabled" : "Disabled"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Spent:</span>
                      <span>KES {membership.totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Services Purchased:</span>
                      <span>{membership.servicesPurchased}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    onClick={() => setShowUpgradeForm(true)}
                  >
                    Upgrade Membership
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* VIP Services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {vipServices.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {service.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Features */}
                  <div>
                    <h4 className="font-semibold mb-2">Features</h4>
                    <ul className="space-y-1">
                      {service.features.slice(0, 4).map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pricing */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">
                          {service.pricing_currency} {service.pricing_amount.toLocaleString()}
                          {service.pricing_period && `/${service.pricing_period}`}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">
                          {service.pricing_type} {service.pricing_type === "subscription" ? "fee" : "service"}
                        </p>
                      </div>
                      <Button
                        onClick={() => purchaseService(service.id)}
                        disabled={purchasing === String(service.id)}
                        size="sm"
                      >
                        {purchasing === String(service.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : service.pricing_type === "subscription" ? (
                          "Subscribe"
                        ) : (
                          "Purchase"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* International Shipping Calculator */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              International Shipping Calculator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="destination">Destination Country</Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    <SelectItem value="Germany">Germany</SelectItem>
                    <SelectItem value="Japan">Japan</SelectItem>
                    <SelectItem value="Australia">Australia</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="UAE">United Arab Emirates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="weight">Package Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="0.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="value">Package Value (KES)</Label>
                <Input
                  id="value"
                  type="number"
                  placeholder="50000"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <Button onClick={calculateShippingCost} disabled={calculating}>
                {calculating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Calculate Shipping Cost
              </Button>
              {calculatedCost && (
                <Button onClick={createShipmentRequest} variant="outline">
                  Request Shipment
                </Button>
              )}
            </div>
            {calculatedCost && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="font-semibold">Estimated Shipping Cost: {calculatedCost.currency} {calculatedCost.cost.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Estimated Delivery: {calculatedCost.estimatedDelivery}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* VIP Benefits Overview */}
        <Card>
          <CardHeader>
            <CardTitle>VIP Membership Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="flex justify-center mb-2">
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
                <h3 className="font-semibold text-lg">Gold</h3>
                <p className="text-2xl font-bold text-yellow-600">KES 2,500/year</p>
                <ul className="text-sm mt-4 space-y-1">
                  <li>• Priority support</li>
                  <li>• Exclusive discounts</li>
                  <li>• Early access to sales</li>
                  <li>• Free standard shipping</li>
                </ul>
              </div>

              <div className="text-center p-4 border rounded-lg bg-blue-50">
                <div className="flex justify-center mb-2">
                  <Crown className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg">Platinum</h3>
                <p className="text-2xl font-bold text-blue-600">KES 7,500/year</p>
                <ul className="text-sm mt-4 space-y-1">
                  <li>• All Gold benefits</li>
                  <li>• Express shipping</li>
                  <li>• Personal concierge</li>
                  <li>• VIP event invites</li>
                  <li>• Exclusive products</li>
                </ul>
              </div>

              <div className="text-center p-4 border rounded-lg bg-purple-50">
                <div className="flex justify-center mb-2">
                  <Gift className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg">Diamond</h3>
                <p className="text-2xl font-bold text-purple-600">KES 15,000/year</p>
                <ul className="text-sm mt-4 space-y-1">
                  <li>• All Platinum benefits</li>
                  <li>• International white-glove</li>
                  <li>• Dedicated account manager</li>
                  <li>• Custom product sourcing</li>
                  <li>• Emergency assistance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade Form Modal */}
        {showUpgradeForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Upgrade VIP Membership</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="tier">Select New Tier</Label>
                  <Select value={selectedTier} onValueChange={(value: "gold" | "platinum" | "diamond") => setSelectedTier(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gold">Gold - KES 2,500/year</SelectItem>
                      <SelectItem value="platinum">Platinum - KES 7,500/year</SelectItem>
                      <SelectItem value="diamond">Diamond - KES 15,000/year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Upgrade Benefits</h4>
                  <p className="text-sm text-gray-600">
                    Your new membership will take effect immediately. Unused time from your current membership will be credited.
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={upgradeMembership} disabled={upgrading} className="flex-1">
                    {upgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirm Upgrade
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowUpgradeForm(false)}
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