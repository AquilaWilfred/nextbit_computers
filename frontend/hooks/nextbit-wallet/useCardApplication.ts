// 04-hooks/useCardApplication.ts

import { useState, useCallback } from 'react';
import { cardsService } from '@/lib/services/nextbit-wallet/cards.service';
import { CardType, EmploymentStatus, ApplicationFormData } from '@/types/nextbit-wallet/cards.types';
import { toast } from 'sonner';

interface UseCardApplicationProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useCardApplication({ onSuccess, onError }: UseCardApplicationProps = {}) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [formData, setFormData] = useState<Partial<ApplicationFormData>>({});

  const updateFormField = useCallback(<K extends keyof ApplicationFormData>(
    field: K, 
    value: ApplicationFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({});
    setSelectedCard("");
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!selectedCard) {
      toast.error("Please select a card type");
      return false;
    }
    if (!formData.full_name?.trim()) {
      toast.error("Please enter your full name");
      return false;
    }
    if (!formData.id_number?.trim()) {
      toast.error("Please enter your ID number");
      return false;
    }
    if (!formData.phone?.trim()) {
      toast.error("Please enter your phone number");
      return false;
    }
    if (!formData.email?.trim()) {
      toast.error("Please enter your email address");
      return false;
    }
    return true;
  }, [selectedCard, formData]);

  const submitApplication = useCallback(async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const applicationData: ApplicationFormData = {
        product_type: selectedCard as CardType,
        full_name: formData.full_name!,
        id_number: formData.id_number!,
        phone: formData.phone!,
        email: formData.email!,
        employment: (formData.employment as EmploymentStatus) || "employed",
      };

      await cardsService.applyForCard(applicationData);
      toast.success("Application submitted successfully!");
      resetForm();
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to submit application");
      toast.error(error.message);
      onError?.(error);
    } finally {
      setSubmitting(false);
    }
  }, [validateForm, selectedCard, formData, resetForm, onSuccess, onError]);

  return {
    submitting,
    selectedCard,
    formData,
    setSelectedCard,
    setFormData,
    updateFormField,
    submitApplication,
    resetForm,
  };
}