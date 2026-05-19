"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ProductOption {
  id: number;
  name: string;
  category?: string;
  wholesalePrice: number;
  currency: string;
}

interface LPOItem {
  productId: number;
  productName: string; // For manually entered products
  productCategory: string; // For manually entered products
  isManualEntry: boolean; // Toggle between catalog selection and manual entry
  quantity: number;
  unitPrice: number;
  moq: number;
  notes: string;
}

export default function NewLPOPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [company, setCompany] = useState("");
  const [catalog, setCatalog] = useState<ProductOption[]>([]);
  const [kraPin, setKraPin] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<LPOItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prefillCompany = searchParams.get("company");
    if (prefillCompany) {
      setCompany(prefillCompany);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/b2b/catalog")
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        if (Array.isArray(data)) {
          setCatalog(data);
        }
      })
      .catch(() => setCatalog([]));
  }, []);

  const addItem = () => {
    setItems([
      ...items,
      {
        productId: 0,
        productName: "",
        productCategory: "",
        isManualEntry: false,
        quantity: 1,
        unitPrice: 0,
        moq: 1,
        notes: "",
      },
    ]);
  };

  const updateItem = (index: number, field: keyof LPOItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const selectProduct = (index: number, productId: number) => {
    const product = catalog.find((item) => item.id === productId);
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId,
      productName: product ? product.name : "",
      productCategory: product ? (product.category || "") : "",
      isManualEntry: false,
      unitPrice: product ? product.wholesalePrice : newItems[index].unitPrice,
    };
    setItems(newItems);
  };

  const toggleManualEntry = (index: number, isManual: boolean) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      isManualEntry: isManual,
      productId: 0,
      productName: "",
      productCategory: "",
    };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const calculateTax = () => {
    return Math.round(calculateTotal() * 0.16 * 100) / 100; // 16% VAT, rounded to 2 decimals
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that all items have a product selected or entered
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.isManualEntry) {
        if (!item.productName || item.productName.trim() === "") {
          toast.error(`Item ${i + 1}: Please enter a product name`);
          return;
        }
      } else {
        if (!item.productId || item.productId === 0) {
          toast.error(`Item ${i + 1}: Please select a product or switch to manual entry`);
          return;
        }
      }
      if (item.quantity < 1) {
        toast.error(`Item ${i + 1}: Quantity must be at least 1`);
        return;
      }
      if (item.unitPrice <= 0) {
        toast.error(`Item ${i + 1}: Unit price must be greater than 0`);
        return;
      }
    }
    
    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch("/api/b2b/lpos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          kraPin,
          billingAddress,
          dueDate,
          description,
          amount: calculateTotal(),
          taxAmount: calculateTax(),
          items,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to create LPO");
      }

      const data = await response.json();
      if (!data?.id) {
        throw new Error("Missing LPO ID in response");
      }
      toast.success("LPO created successfully!");
      router.push(`/b2b/lpos/${data.id}`);
    } catch (error) {
      toast.error("Failed to create LPO");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New LPO</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <p className="text-xs text-muted-foreground mb-2">
                Enter the buyer's registered company name for this purchase.
              </p>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">KRA PIN</label>
              <p className="text-xs text-muted-foreground mb-2">
                Enter the company's tax PIN to include on the invoice.
              </p>
              <Input
                value={kraPin}
                onChange={(e) => setKraPin(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Billing Address</label>
              <p className="text-xs text-muted-foreground mb-2">
                Use the billing address that should appear on the generated invoice.
              </p>
              <Textarea
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <p className="text-xs text-muted-foreground mb-2">
                Choose when payment is due for this order.
              </p>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <p className="text-xs text-muted-foreground mb-2">
                Add a short memo so your team knows the purpose of this LPO.
              </p>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium">Product Source</label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant={!item.isManualEntry ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleManualEntry(index, false)}
                        >
                          From Catalog
                        </Button>
                        <Button
                          type="button"
                          variant={item.isManualEntry ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleManualEntry(index, true)}
                        >
                          Manual Entry
                        </Button>
                      </div>
                    </div>
                  </div>

                  {!item.isManualEntry ? (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Product / SKU
                      </label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Select the product type and model for this line.
                      </p>
                      <select
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                        value={item.productId}
                        onChange={(e) => selectProduct(index, Number(e.target.value))}
                        required
                      >
                        <option value={0}>Select item</option>
                        {catalog.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.category ? `${product.category} — ${product.name}` : product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">Product Name</label>
                        <Input
                          value={item.productName}
                          onChange={(e) => updateItem(index, "productName", e.target.value)}
                          placeholder="e.g., Dell Laptop, HP Monitor"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <Input
                          value={item.productCategory}
                          onChange={(e) => updateItem(index, "productCategory", e.target.value)}
                          placeholder="e.g., Computers, Peripherals"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Quantity</label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Unit Price</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">MOQ</label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Minimum order quantity.
                      </p>
                      <Input
                        type="number"
                        min="1"
                        value={item.moq}
                        onChange={(e) => updateItem(index, "moq", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Notes / Specs</label>
                      <Input
                        value={item.notes}
                        onChange={(e) => updateItem(index, "notes", e.target.value)}
                        placeholder="Special instructions"
                      />
                    </div>
                  </div>

                  <Button type="button" variant="destructive" onClick={() => removeItem(index)} className="w-full">
                    Remove Item
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={addItem}>
                + Add Item
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between text-lg font-semibold">
              <span>Subtotal:</span>
              <span>KES {calculateTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Tax (16%):</span>
              <span>KES {calculateTax().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t pt-2">
              <span>Total:</span>
              <span>KES {(calculateTotal() + calculateTax()).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create LPO"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}