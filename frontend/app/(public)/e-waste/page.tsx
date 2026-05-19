"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Recycle, Truck, DollarSign, MapPin, Calendar, CheckCircle } from "lucide-react";

interface DeviceForTradeIn {
  id: string;
  type: string;
  brand: string;
  model: string;
  condition: "excellent" | "good" | "fair" | "poor";
  estimatedValue: number;
  status: "pending" | "approved" | "collected" | "processed";
  createdAt: string;
}

interface RecyclingCenter {
  id: string;
  name: string;
  location: string;
  distance: number;
  rating: number;
  certified: boolean;
}

export default function EWastePage() {
  const [tradeInRequests, setTradeInRequests] = useState<DeviceForTradeIn[]>([]);
  const [recyclingCenters, setRecyclingCenters] = useState<RecyclingCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTradeInForm, setShowTradeInForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");

  // Form state
  const [deviceType, setDeviceType] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [condition, setCondition] = useState<"excellent" | "good" | "fair" | "poor">("good");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    fetchEWasteData();
  }, []);

  const fetchEWasteData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      setTradeInRequests([
        {
          id: "1",
          type: "Laptop",
          brand: "Dell",
          model: "Latitude 5420",
          condition: "good",
          estimatedValue: 25000,
          status: "pending",
          createdAt: new Date().toISOString(),
        },
      ]);

      setRecyclingCenters([
        {
          id: "1",
          name: "NextBit Green Center",
          location: "Nairobi CBD",
          distance: 2.5,
          rating: 4.8,
          certified: true,
        },
        {
          id: "2",
          name: "EcoTech Recycling",
          location: "Westlands",
          distance: 5.1,
          rating: 4.6,
          certified: true,
        },
      ]);
    } catch (error) {
      toast.error("Failed to load e-waste data");
    } finally {
      setLoading(false);
    }
  };

  const submitTradeInRequest = async () => {
    if (!deviceType || !brand || !model || !location) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch("/api/e-waste/trade-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceType,
          brand,
          model,
          condition,
          description,
          location,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit trade-in request");

      toast.success("Trade-in request submitted successfully!");
      setShowTradeInForm(false);
      // Reset form
      setDeviceType("");
      setBrand("");
      setModel("");
      setCondition("good");
      setDescription("");
      setLocation("");
      fetchEWasteData();
    } catch (error) {
      toast.error("Failed to submit trade-in request");
    }
  };

  const filteredCenters = recyclingCenters.filter(center => {
    return !selectedLocation || center.location.toLowerCase().includes(selectedLocation.toLowerCase());
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <Recycle className="h-8 w-8 text-green-600" />
          NextBit E-Waste Circular Economy
        </h1>
        <p className="text-gray-600">
          Trade in your old devices for NextBit credit and contribute to a sustainable future.
          Compliant with NEMA 2026 regulations.
        </p>
      </div>

      {/* Hero Section */}
      <Card className="mb-8 bg-gradient-to-r from-green-50 to-blue-50">
        <CardContent className="p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Turn Your Old Device into Value</h2>
            <p className="text-gray-600 mb-6">
              Get instant valuation, free pickup, and NextBit credit for your old electronics.
            </p>
            <Button
              onClick={() => setShowTradeInForm(true)}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              Start Trade-In Process
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Recycling Centers */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Find Recycling Centers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="location"
                  placeholder="Enter location"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recycling Centers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {filteredCenters.map((center) => (
          <Card key={center.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{center.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{center.location}</span>
                    <span className="text-sm text-gray-500">({center.distance} km)</span>
                  </div>
                </div>
                {center.certified && (
                  <Badge className="bg-green-100 text-green-800">NEMA Certified</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">Rating:</span>
                  <span className="text-sm">{center.rating}/5</span>
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trade-In Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Your Trade-In Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {tradeInRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No trade-in requests yet. Start your first trade-in to earn NextBit credit.
            </p>
          ) : (
            <div className="space-y-4">
              {tradeInRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{request.brand} {request.model}</h3>
                      <p className="text-sm text-gray-600">{request.type} • {request.condition} condition</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        request.status === "processed" ? "default" :
                        request.status === "collected" ? "secondary" :
                        request.status === "approved" ? "outline" : "secondary"
                      }>
                        {request.status.replace("_", " ")}
                      </Badge>
                      <p className="text-sm font-medium text-green-600 mt-1">
                        Est. Value: KES {request.estimatedValue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                    {request.status === "collected" && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-4 w-4" />
                        Collected
                      </span>
                    )}
                    {request.status === "processed" && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Credit issued
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade-In Form Modal */}
      {showTradeInForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Trade-In Your Device</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="deviceType">Device Type *</Label>
                <Select value={deviceType} onValueChange={setDeviceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laptop">Laptop</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="monitor">Monitor</SelectItem>
                    <SelectItem value="printer">Printer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  placeholder="e.g., Dell, HP, Lenovo"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  placeholder="e.g., Latitude 5420"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="condition">Condition</Label>
                <Select value={condition} onValueChange={(value: "excellent" | "good" | "fair" | "poor") => setCondition(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent (Like new)</SelectItem>
                    <SelectItem value="good">Good (Minor wear)</SelectItem>
                    <SelectItem value="fair">Fair (Some damage)</SelectItem>
                    <SelectItem value="poor">Poor (Heavy damage)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Additional Description</Label>
                <Textarea
                  id="description"
                  placeholder="Any additional details about the device..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="location">Pickup Location *</Label>
                <Input
                  id="location"
                  placeholder="Your location for pickup"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">What happens next?</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• We'll evaluate your device and provide a quote</li>
                  <li>• Free pickup arranged if you accept</li>
                  <li>• Secure data wiping and recycling</li>
                  <li>• NextBit credit issued to your account</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={submitTradeInRequest} className="flex-1">
                  Submit Trade-In Request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowTradeInForm(false)}
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