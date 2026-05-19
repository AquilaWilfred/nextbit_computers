import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Category, FormData } from "@/types/categories.types";
import { slugify } from "@/lib/utils/category.utils";

interface UseCategoryFormProps {
  onSave: (data: Partial<Category>) => Promise<Category>;
  onClose: () => void;
}

export function useCategoryForm({ onSave, onClose }: UseCategoryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentId, setParentId] = useState<number | null>(null);

  const openForm = useCallback((category?: Category, prefillParentId?: number) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ ...category });
      setParentId(category.parentId ?? null);
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        slug: "",
        description: "",
        imageUrl: "",
        icon: "",
        featured: false,
        active: true,
        parentId: prefillParentId ?? null,
      });
      setParentId(prefillParentId ?? null);
    }
    setIsOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsOpen(false);
    setFormData({});
    setEditingCategory(null);
    setParentId(null);
    onClose();
  }, [onClose]);

  const updateField = useCallback(<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Category> = {
        ...formData,
        slug: formData.slug || slugify(formData.name!),
        description: formData.description || null,
        imageUrl: formData.imageUrl || null,
        icon: !formData.icon || formData.icon === "none" ? null : formData.icon,
      };
      
      await onSave(payload);
      closeForm();
      toast.success("Category saved!");
    } catch (err: any) {
      toast.error(err.message ?? "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave, closeForm]);

  const setParentCategory = useCallback((value: string) => {
    const newParentId = value === "null" ? null : parseInt(value);
    setParentId(newParentId);
    setFormData((prev) => ({ ...prev, parentId: newParentId }));
  }, []);

  const setHierarchy = useCallback((value: "top" | "sub", defaultParentId?: number) => {
    setFormData((prev) => ({
      ...prev,
      parentId: value === "top" ? null : (defaultParentId ?? null),
    }));
  }, []);

  return {
    isOpen,
    formData,
    isSaving,
    editingCategory,
    parentId,
    openForm,
    closeForm,
    updateField,
    handleSubmit,
    setParentCategory,
    setHierarchy,
  };
}