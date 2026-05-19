"use client";

import { memo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { ProductFormData, Category } from "@/types/products/man/products.types";
import { ProductImageUpload } from "./ProductImageUpload";
import { ProductPriceSection } from "./ProductPriceSection";
import { CategorySelect } from "./CategorySelect";

interface ProductFormProps {
  isOpen: boolean;
  editingId: number | null;
  formData: ProductFormData;
  isSubmitting: boolean;
  isUploading: boolean;
  categories: Category[];
  rootCategories: Category[];
  brands: string[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onUpdateField: <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => void;
  onPriceChange: (value: string) => void;
  onApplyDiscount: (percentage: number) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTriggerUpload: () => void;
  onRemoveImage: (index: number) => void;
}

export const ProductForm = memo(function ProductForm({
  isOpen,
  editingId,
  formData,
  isSubmitting,
  isUploading,
  categories,
  rootCategories,
  brands,
  fileInputRef,
  onClose,
  onSubmit,
  onUpdateField,
  onPriceChange,
  onApplyDiscount,
  onImageUpload,
  onTriggerUpload,
  onRemoveImage,
}: ProductFormProps) {
  if (!isOpen) return null;

  const subCategories = categories.filter((c) => c.parentId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">{editingId ? "Edit Product" : "Add New Product"}</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Name + Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Product Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => onUpdateField("name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <select
                  value={formData.brand}
                  onChange={(e) => onUpdateField("brand", e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select Brand...</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price Section */}
            <ProductPriceSection
              price={formData.price}
              comparePrice={formData.comparePrice}
              onPriceChange={onPriceChange}
              onComparePriceChange={(val) => onUpdateField("comparePrice", val)}
              onApplyDiscount={onApplyDiscount}
            />

            {/* Stock + SKU + Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Stock *</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => onUpdateField("stock", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => onUpdateField("sku", e.target.value)}
                />
              </div>
              <CategorySelect
                value={formData.categoryId}
                rootCategories={rootCategories}
                subCategories={subCategories}
                onChange={(val) => onUpdateField("categoryId", val)}
              />
            </div>

            {/* Descriptions */}
            <div className="space-y-1.5">
              <Label>Short Description</Label>
              <Input
                value={formData.shortDescription}
                onChange={(e) => onUpdateField("shortDescription", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Full Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => onUpdateField("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* Images */}
            <ProductImageUpload
              images={formData.images}
              isUploading={isUploading}
              fileInputRef={fileInputRef}
              onUpload={onTriggerUpload}
              onRemove={onRemoveImage}
              onFileChange={onImageUpload}
            />

            {/* Specifications */}
            <div className="space-y-1.5">
              <Label>Specifications (Format: "Key: Value" one per line)</Label>
              <Textarea
                value={formData.specifications}
                onChange={(e) => onUpdateField("specifications", e.target.value)}
                rows={4}
                placeholder={"Processor: Intel Core i7\nRAM: 16GB DDR5"}
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label>Tags (Comma separated)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => onUpdateField("tags", e.target.value)}
                placeholder="gaming, professional, creative"
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={formData.featured}
                  onCheckedChange={(c) => onUpdateField("featured", c)}
                />
                <span className="text-sm font-medium">Featured product</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={formData.active}
                  onCheckedChange={(c) => onUpdateField("active", c)}
                />
                <span className="text-sm font-medium">Active (Visible)</span>
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[var(--brand)] text-white hover:opacity-90"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingId ? (
                  "Update Product"
                ) : (
                  "Create Product"
                )}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
});