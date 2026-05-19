"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Plane, Truck, Headphones, Star, CheckCircle, Gift } from "lucide-react";

interface VIPService {
  id: string;
  name: string;
  description: string;
  features: string[];
  pricing: {
    type: "one-time" | "subscription";
    amount: number;
    currency: string;
    period?: string;
  };
  category: "shipping" | "support" | "concierge" | "exclusive";
}

interface VIPMembership {
  id: string;
  tier: "gold" | "platinum" | "diamond";
  status: "active" | "inactive" | "pending";
  joinedAt: string;
  expiresAt: string;
  benefits: string[];
}

export default function VIPPage() {
  const [vipServices, setVipServices] = useState<VIPService[]>([]);
  const [membership, setMembership] = useState<VIPMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"gold" | "platinum" | "diamond">("gold");

  useEffect(() => {
    fetchVIPData();
  }, []);

  const fetchVIPData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      setVipServices([
        {
          id: "express-shipping",
          name: "NextBit Express",
          description: "1-4 hour urgent delivery service across Nairobi and major towns",
          features: [
            "Same-day delivery guarantee",
            "Real-time GPS tracking",
            "Dedicated delivery agent",
            "Signature required",
            "Insurance included"
          ],
          pricing: {
            type: "one-time",
            amount: 1500,
            currency: "KES"
          },
          category: "shipping"
        },
        {
          id: "international-shipping",
          name: "International White-Glove Service",
          description: "Premium international shipping with customs clearance and concierge support",
          features: [
            "Door-to-door service",
            "Customs clearance assistance",
            "Real-time tracking",
            "Insurance up to $10,000",
            "Priority handling"
          ],
          pricing: {
            type: "one-time",
            amount: 25000,
            currency: "KES"
          },
          category: "shipping"
        },
        {
          id: "concierge-support",
          name: "VIP Concierge Support",
          description: "24/7 dedicated support with priority response and personal assistant",
          features: [
            "Dedicated account manager",
            "Priority phone support",
            "WhatsApp concierge",
            "Emergency assistance",
            "Personal shopping assistant"
          ],
          pricing: {
            type: "subscription",
            amount: 5000,
            currency: "KES",
            period: "month"
          },
          category: "support"
        },
        {
          id: "exclusive-access",
          name: "Exclusive Product Access",
          description: "Early access to limited edition products and special collections",
          features: [
            "Pre-launch access",
            "Limited edition products",
            "VIP pricing",
            "Exclusive events",
            "Personal styling sessions"
          ],
          pricing: {
            type: "subscription",
            amount: 10000,
            currency: "KES",
            period: "month"
          },
          category: "exclusive"
        }
      ]);

      setMembership({
        id: "1",
        tier: "gold",
        status: "active",
        joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
        benefits: [
          "Priority customer support",
          "Exclusive discounts",
          "Early access to sales",
          "Free standard shipping"
        ]
      });
    } catch (error) {
      toast.error("Failed to load VIP data");
    } finally {
      setLoading(false);
    }
  };

  const upgradeMembership = async () => {
    try {
      const response = await fetch("/api/vip/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedTier,
        }),
      });

      if (!response.ok) throw new Error("Failed to upgrade membership");

      toast.success(`Successfully upgraded to ${selectedTier} membership!`);
      setShowUpgradeForm(false);
      fetchVIPData();
    } catch (error) {
      toast.error("Failed to upgrade membership");
    }
  };

  const purchaseService = async (serviceId: string) => {
    try {
      const response = await fetch("/api/vip/services/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
        }),
      });

      if (!response.ok) throw new Error("Failed to purchase service");

      toast.success("Service purchased successfully!");
    } catch (error) {
      toast.error("Failed to purchase service");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <Crown className="h-8 w-8 text-yellow-600" />
          NextBit VIP & International Trade
        </h1>
        <p className="text-gray-600">
          Exclusive services for premium clients requiring international shipment and white-glove service.
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
                  Current Membership: {membership.tier.charAt(0).toUpperCase() + membership.tier.slice(1)}
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
                    <span>Enabled</span>
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
                    {service.features.map((feature, index) => (
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
                        {service.pricing.currency} {service.pricing.amount.toLocaleString()}
                        {service.pricing.period && `/${service.pricing.period}`}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {service.pricing.type} {service.pricing.type === "subscription" ? "fee" : "service"}
                      </p>
                    </div>
                    <Button
                      onClick={() => purchaseService(service.id)}
                      size="sm"
                    >
                      {service.pricing.type === "subscription" ? "Subscribe" : "Purchase"}
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
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="de">Germany</SelectItem>
                  <SelectItem value="jp">Japan</SelectItem>
                  <SelectItem value="au">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="weight">Package Weight (kg)</Label>
              <Input id="weight" type="number" placeholder="0.5" />
            </div>
            <div>
              <Label htmlFor="value">Package Value (KES)</Label>
              <Input id="value" type="number" placeholder="50000" />
            </div>
          </div>
          <Button className="mt-4">
            Calculate Shipping Cost
          </Button>
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
                <Button onClick={upgradeMembership} className="flex-1">
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
  );
}