import { useState, useCallback } from "react";
import { ContentType, FormData } from "@/types/content.types";
import { formatDateForInput } from "@/lib/utils/content.utils";

interface UseContentFormProps {
  onSave: (data: FormData, type: ContentType) => Promise<void>;
  onClose: () => void;
}

export function useContentForm({ onSave, onClose }: UseContentFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formType, setFormType] = useState<ContentType | null>(null);
  const [formData, setFormData] = useState<FormData>({});
  const [isSaving, setIsSaving] = useState(false);

  const openForm = useCallback((type: ContentType, item?: FormData) => {
    setFormType(type);
    if (item) {
      const data = { ...item };
      if (type === "announcement" && data.date) {
        data.date = formatDateForInput(data.date);
      }
      setFormData(data);
    } else {
      setFormData({ active: true });
    }
    setIsOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsOpen(false);
    setFormType(null);
    setFormData({});
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
    if (!formType) return;

    setIsSaving(true);
    try {
      await onSave(formData, formType);
      closeForm();
    } finally {
      setIsSaving(false);
    }
  }, [formData, formType, onSave, closeForm]);

  return {
    isOpen,
    formType,
    formData,
    isSaving,
    openForm,
    closeForm,
    updateField,
    handleSubmit,
  };
}