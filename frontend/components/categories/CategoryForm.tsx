"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { CategoryImageUpload } from "./CategoryImageUpload";
import { CategoryIconSelect } from "./CategoryIconSelect";
import { Category } from "@/types/categories.types";

interface CategoryFormProps {
  isOpen: boolean;
  formData: Partial<Category>;
  isSaving: boolean;
  isUploading: boolean;
  editingCategory: Category | null;
  parentId: number | null;
  rootCategories: Category[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onUpdateField: <K extends keyof Partial<Category>>(field: K, value: Partial<Category>[K]) => void;
  onSetParentCategory: (value: string) => void;
  onSetHierarchy: (value: "top" | "sub") => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTriggerUpload: () => void;
  onRemoveImage: () => void;
}

export const CategoryForm = memo(function CategoryForm({
  isOpen,
  formData,
  isSaving,
  isUploading,
  editingCategory,
  parentId,
  rootCategories,
  fileInputRef,
  onClose,
  onSubmit,
  onUpdateField,
  onSetParentCategory,
  onSetHierarchy,
  onImageUpload,
  onTriggerUpload,
  onRemoveImage,
}: CategoryFormProps) {
  if (!isOpen) return null;

  const isEditing = !!editingCategory;
  const isSubCategory = formData.parentId !== null && formData.parentId !== undefined;
  const hasRootCategories = rootCategories.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Edit Category" : formData.parentId ? "Add Sub-Category" : "Add Parent Category"}
    >
      <Card className="w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {isEditing ? "Edit Category" : formData.parentId ? "Add Sub-Category" : "Add Parent Category"}
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              ✕
            </Button>
          </div>

          <div className="space-y-4">
            {/* Hierarchy Placement */}
            <div className="p-4 bg-muted/40 border border-border rounded-xl">
              <Label className="text-sm font-semibold mb-3 block">Hierarchy Placement</Label>
              <RadioGroup
                value={formData.parentId === null || formData.parentId === undefined ? "top" : "sub"}
                onValueChange={(val) => onSetHierarchy(val as "top" | "sub")}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="top" id="top" />
                  <Label htmlFor="top" className="cursor-pointer font-medium text-sm">
                    Top-Level (Parent)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sub" id="sub" disabled={!hasRootCategories} />
                  <Label
                    htmlFor="sub"
                    className={`cursor-pointer font-medium text-sm ${!hasRootCategories ? "opacity-50" : ""}`}
                  >
                    Sub-Category
                  </Label>
                </div>
              </RadioGroup>

              {isSubCategory && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Label className="text-xs text-muted-foreground mb-2 block">Assign to Parent</Label>
                  <Select
                    value={String(parentId ?? formData.parentId ?? "")}
                    onValueChange={onSetParentCategory}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Choose a parent…" />
                    </SelectTrigger>
                    <SelectContent>
                      {rootCategories
                        .filter((c) => c.id !== editingCategory?.id)
                        .map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category Name *</Label>
              <Input
                id="cat-name"
                required
                value={formData.name || ""}
                onChange={(e) => onUpdateField("name", e.target.value)}
                placeholder="e.g. Laptops"
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="cat-slug">Slug (URL friendly)</Label>
              <Input
                id="cat-slug"
                value={formData.slug || ""}
                onChange={(e) => onUpdateField("slug", e.target.value)}
                placeholder="e.g. laptops (auto-generated if empty)"
              />
            </div>

            {/* Image Upload */}
            <CategoryImageUpload
              imageUrl={formData.imageUrl || null}
              isUploading={isUploading}
              onUpload={onTriggerUpload}
              onRemove={onRemoveImage}
              fileInputRef={fileInputRef}
              onFileChange={onImageUpload}
            />

            {/* Icon Select */}
            <CategoryIconSelect
              value={formData.icon || null}
              onChange={(value) => onUpdateField("icon", value)}
            />

            {/* Featured Switch */}
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <Label htmlFor="featured" className="cursor-pointer">
                Featured on Homepage
              </Label>
              <Switch
                id="featured"
                checked={!!formData.featured}
                onCheckedChange={(c) => onUpdateField("featured", c)}
              />
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <Label htmlFor="active" className="cursor-pointer">
                Active (Visible)
              </Label>
              <Switch
                id="active"
                checked={formData.active ?? true}
                onCheckedChange={(c) => onUpdateField("active", c)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                value={formData.description || ""}
                onChange={(e) => onUpdateField("description", e.target.value)}
                placeholder="Category description"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || isUploading}
              className="bg-[var(--brand)] text-white hover:opacity-90 min-w-24"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
});