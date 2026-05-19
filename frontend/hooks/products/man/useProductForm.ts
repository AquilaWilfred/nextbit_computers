import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Product, ProductFormData } from "@/types/products/man/products.types";
import { generateSlug, parseSpecifications, parseTags, formatSpecificationsToString } from "@/lib/utils/products/man/man.products.utils";
import { DEFAULT_FORM } from "@/constants/products/man/man.products.constants";

export function useProductForm(onSuccess: (data: any, isEditing: boolean) => Promise<void>) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({ ...DEFAULT_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openForm = useCallback((product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name || "",
        slug: product.slug || "",
        categoryId: String(product.categoryId || ""),
        price: String(product.price || ""),
        comparePrice: String(product.comparePrice || ""),
        stock: String(product.stock ?? "0"),
        brand: product.brand || "",
        sku: product.sku || "",
        description: product.description || "",
        shortDescription: product.shortDescription || "",
        images: Array.isArray(product.images) ? product.images : [],
        specifications: formatSpecificationsToString(product.specifications),
        tags: product.tags?.join(", ") || "",
        featured: product.featured || false,
        active: product.active ?? true,
      });
    } else {
      setEditingId(null);
      setFormData({ ...DEFAULT_FORM });
    }
    setIsOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsOpen(false);
    setEditingId(null);
    setFormData({ ...DEFAULT_FORM });
  }, []);

  const updateField = useCallback(<K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoryId) {
      toast.error("Please select a category");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        categoryId: parseInt(formData.categoryId),
        name: formData.name,
        slug: generateSlug(formData.name, formData.slug),
        description: formData.description || undefined,
        shortDescription: formData.shortDescription || undefined,
        price: formData.price,
        comparePrice: formData.comparePrice || undefined,
        stock: parseInt(formData.stock) || 0,
        brand: formData.brand || undefined,
        sku: formData.sku || undefined,
        images: formData.images,
        specifications: parseSpecifications(formData.specifications),
        tags: parseTags(formData.tags),
        featured: formData.featured,
        active: formData.active,
      };
      
      await onSuccess(payload, !!editingId);
      closeForm();
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingId, onSuccess, closeForm]);

  const setPrice = useCallback((price: string) => {
    updateField("price", price);
  }, [updateField]);

  const applyDiscount = useCallback((percentage: number) => {
    const comparePrice = parseFloat(formData.comparePrice);
    if (comparePrice > 0) {
      const newPrice = (comparePrice * (1 - percentage / 100)).toFixed(2);
      updateField("price", newPrice);
    }
  }, [formData.comparePrice, updateField]);

  return {
    isOpen,
    editingId,
    formData,
    isSubmitting,
    openForm,
    closeForm,
    updateField,
    handleSubmit,
    setPrice,
    applyDiscount,
  };
}