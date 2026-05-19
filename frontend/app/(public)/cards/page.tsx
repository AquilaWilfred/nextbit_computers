"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Globe, Smartphone, DollarSign, CheckCircle, Star } from "lucide-react";

interface CardProduct {
  id: string;
  name: string;
  type: "e_nextbit" | "global";
  features: string[];
  benefits: string[];
  fees: {
    annual: number;
    foreignTxn: number;
    atm: number;
  };
  requirements: string[];
  popular?: boolean;
}

interface CardApplication {
  id: string;
  cardType: string;
  status: "pending" | "approved" | "rejected" | "active";
  appliedAt: string;
  approvedAt?: string;
}

export default function CardsPage() {
  const [cardProducts, setCardProducts] = useState<CardProduct[]>([]);
  const [applications, setApplications] = useState<CardApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedCard, setSelectedCard] = useState("");

  // Application form state
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [employment, setEmployment] = useState("");

  useEffect(() => {
    fetchCardData();
  }, []);

  const fetchCardData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      setCardProducts([
        {
          id: "e-nextbit",
          name: "E-NextBit Card",
          type: "e_nextbit",
          features: [
            "M-Pesa linked for instant transfers",
            "No annual fees",
            "Free ATM withdrawals at partner banks",
            "Mobile app for easy management",
            "Instant card delivery"
          ],
          benefits: [
            "Earn rewards on every NextBit purchase",
            "Cashback on M-Pesa transactions",
            "Instant loan access",
            "24/7 customer support"
          ],
          fees: {
            annual: 0,
            foreignTxn: 0,
            atm: 0
          },
          requirements: [
            "Kenyan citizen or resident",
            "Valid ID number",
            "Active M-Pesa account",
            "Minimum age 18"
          ],
          popular: true
        },
        {
          id: "global",
          name: "NextBit Global Card",
          type: "global",
          features: [
            "Accepted worldwide",
            "Multi-currency support",
            "Contactless payments",
            "Travel insurance included",
            "Priority customer support"
          ],
          benefits: [
            "No foreign transaction fees",
            "Travel rewards program",
            "Extended warranty on purchases",
            "Concierge services"
          ],
          fees: {
            annual: 2500,
            foreignTxn: 0,
            atm: 0
          },
          requirements: [
            "Kenyan citizen or resident",
            "Valid ID number",
            "Proof of income",
            "Clean credit history",
            "Minimum age 21"
          ]
        }
      ]);

      setApplications([
        {
          id: "1",
          cardType: "E-NextBit Card",
          status: "pending",
          appliedAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      toast.error("Failed to load card data");
    } finally {
      setLoading(false);
    }
  };

  const applyForCard = async () => {
    if (!selectedCard || !fullName || !idNumber || !phoneNumber || !email) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch("/api/cards/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: selectedCard,
          fullName,
          idNumber,
          phoneNumber,
          email,
          employment,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit application");

      toast.success("Card application submitted successfully!");
      setShowApplicationForm(false);
      // Reset form
      setSelectedCard("");
      setFullName("");
      setIdNumber("");
      setPhoneNumber("");
      setEmail("");
      setEmployment("");
      fetchCardData();
    } catch (error) {
      toast.error("Failed to submit card application");
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
          <CreditCard className="h-8 w-8 text-blue-600" />
          NextBit Financial Suite
        </h1>
        <p className="text-gray-600">
          Choose the perfect card for your needs - from local convenience to global spending power.
        </p>
      </div>

      {/* Card Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {cardProducts.map((card) => (
          <Card key={card.id} className={`hover:shadow-lg transition-shadow ${card.popular ? 'ring-2 ring-blue-500' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {card.type === "e_nextbit" ? (
                      <Smartphone className="h-5 w-5 text-green-600" />
                    ) : (
                      <Globe className="h-5 w-5 text-blue-600" />
                    )}
                    {card.name}
                  </CardTitle>
                  {card.popular && (
                    <Badge className="mt-2 bg-blue-100 text-blue-800">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    KES {card.fees.annual.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">annual fee</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Features */}
                <div>
                  <h4 className="font-semibold mb-2">Key Features</h4>
                  <ul className="space-y-1">
                    {card.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Benefits */}
                <div>
                  <h4 className="font-semibold mb-2">Benefits</h4>
                  <ul className="space-y-1">
                    {card.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Fees */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Fees</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Annual Fee:</span>
                      <span>KES {card.fees.annual.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Foreign Transaction:</span>
                      <span>{card.fees.foreignTxn === 0 ? 'Free' : `KES ${card.fees.foreignTxn}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ATM Withdrawal:</span>
                      <span>{card.fees.atm === 0 ? 'Free' : `KES ${card.fees.atm}`}</span>
                    </div>
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <h4 className="font-semibold mb-2">Requirements</h4>
                  <ul className="space-y-1">
                    {card.requirements.map((req, index) => (
                      <li key={index} className="text-sm text-gray-600">• {req}</li>
                    ))}
                  </ul>
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    setSelectedCard(card.id);
                    setShowApplicationForm(true);
                  }}
                >
                  Apply Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Your Card Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No card applications yet. Apply for your first NextBit card above.
            </p>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <div key={application.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{application.cardType}</h3>
                      <p className="text-sm text-gray-600">
                        Applied: {new Date(application.appliedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={
                      application.status === "active" ? "default" :
                      application.status === "approved" ? "secondary" :
                      application.status === "pending" ? "outline" : "destructive"
                    }>
                      {application.status}
                    </Badge>
                  </div>
                  {application.status === "approved" && application.approvedAt && (
                    <p className="text-sm text-green-600">
                      Approved: {new Date(application.approvedAt).toLocaleDateString()}
                    </p>
                  )}
                  {application.status === "pending" && (
                    <p className="text-sm text-yellow-600">
                      Application under review. We'll notify you within 3-5 business days.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Form Modal */}
      {showApplicationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Apply for {cardProducts.find(c => c.id === selectedCard)?.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="idNumber">ID Number *</Label>
                <Input
                  id="idNumber"
                  placeholder="Enter your ID number"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  placeholder="e.g., +254712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="employment">Employment Status</Label>
                <Select value={employment} onValueChange={setEmployment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employed">Employed</SelectItem>
                    <SelectItem value="self-employed">Self-employed</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="unemployed">Unemployed</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Application Process</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Instant approval for E-NextBit Card</li>
                  <li>• NextBit Global Card requires credit check</li>
                  <li>• Cards delivered within 3-5 business days</li>
                  <li>• All applications are subject to verification</li>
                </ul>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={applyForCard} className="flex-1">
                  Submit Application
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowApplicationForm(false)}
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