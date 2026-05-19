"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  wholesalePrice: number;
  retailPrice: number;
  currency: string;
  stock: number;
  minOrderQty: number;
  unit: string;
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCatalog();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory]);

  const fetchCatalog = async () => {
    try {
      const response = await fetch("/api/b2b/catalog");
      if (!response.ok) throw new Error("Failed to fetch catalog");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      toast.error("Failed to load catalog");
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  };

  const categories = [...new Set(products.map(p => p.category))];

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Wholesale Catalog</h1>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle className="text-lg">{product.name}</CardTitle>
              <Badge variant="outline">{product.category}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{product.description}</p>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Wholesale Price:</span>
                  <span className="font-semibold">{product.currency} {product.wholesalePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Retail Price:</span>
                  <span className="text-sm text-gray-500">{product.currency} {product.retailPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Stock:</span>
                  <span className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {product.stock} {product.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Min Order:</span>
                  <span className="text-sm">{product.minOrderQty} {product.unit}</span>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={product.stock === 0}
              >
                {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}