"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, Phone, User, Loader2, AlertCircle } from "lucide-react";

interface Address {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/addresses", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch addresses");
      }

      const data = await response.json();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      toast.error("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/addresses/${editingId}` : "/api/addresses";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save address");
      }

      toast.success(editingId ? "Address updated" : "Address added");
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", phone: "", address: "", city: "", postalCode: "" });
      await fetchAddresses();
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address");
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      const response = await fetch(`/api/addresses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete address");
      }

      toast.success("Address deleted");
      await fetchAddresses();
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Failed to delete address");
    }
  };

  const handleEditAddress = (address: Address) => {
    setFormData({
      name: address.name,
      phone: address.phone,
      address: address.address,
      city: address.city,
      postalCode: address.postalCode,
    });
    setEditingId(address.id);
    setShowForm(true);
  };

  return (
     <div className="max-w-4xl mx-auto space-y-6 py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Saved Addresses</h1>
            <p className="text-muted-foreground mt-2">Manage your delivery addresses</p>
          </div>
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({ name: "", phone: "", address: "", city: "", postalCode: "" });
            }}
            className="gap-2 bg-[var(--brand)] text-white hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--brand)]" />
          </div>
        ) : addresses.length === 0 && !showForm ? (
          <Card className="p-12 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No addresses saved</h3>
            <p className="text-muted-foreground mb-6">Add your first address to get started</p>
            <Button
              onClick={() => setShowForm(true)}
              className="gap-2 bg-[var(--brand)] text-white hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              Add Address
            </Button>
          </Card>
        ) : (
          <>
            {showForm && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingId ? "Edit Address" : "Add New Address"}
                </h3>
                <form onSubmit={handleAddAddress} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md"
                    required
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Postal Code"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="flex-1 bg-[var(--brand)] text-white hover:opacity-90"
                    >
                      {editingId ? "Update Address" : "Add Address"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                        setFormData({ name: "", phone: "", address: "", city: "", postalCode: "" });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <div className="grid gap-4">
              {addresses.map((addr) => (
                <Card key={addr.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-lg font-semibold">{addr.name}</h3>
                        {addr.isDefault && (
                          <span className="px-2 py-1 bg-[var(--brand)] text-white text-xs rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {addr.address}, {addr.city} {addr.postalCode}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {addr.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditAddress(addr)}
                        className="gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
  );
}
