import { useState, useCallback } from 'react';
import { DeviceType, Condition, TradeInFormData } from '@/types/listings/listings.types';
import { toast } from 'sonner';

export function useTradeInForm() {
  const [formData, setFormData] = useState<Partial<TradeInFormData>>({
    device_type: 'laptop',
    condition: 'good',
  });
  const [submitting, setSubmitting] = useState(false);

  const updateField = useCallback(<K extends keyof TradeInFormData>(field: K, value: TradeInFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!formData.brand?.trim()) {
      toast.error('Please enter the brand');
      return false;
    }
    if (!formData.model?.trim()) {
      toast.error('Please enter the model');
      return false;
    }
    if (!formData.asking_price_kes || formData.asking_price_kes < 50) {
      toast.error('Enter a valid asking price in KES (minimum 50)');
      return false;
    }
    if (!formData.drop_branch?.trim()) {
      toast.error('Please select a drop-off branch');
      return false;
    }
    return true;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData({
      device_type: 'laptop',
      condition: 'good',
    });
  }, []);

  const getSubmitData = useCallback((): TradeInFormData | null => {
    if (!validateForm()) return null;
    
    return {
      device_type: formData.device_type!,
      brand: formData.brand!,
      model: formData.model!,
      condition: formData.condition!,
      asking_price_kes: formData.asking_price_kes!,
      drop_branch: formData.drop_branch!,
      specs: formData.specs,
      location: formData.location,
      images: formData.images || [],
    };
  }, [formData, validateForm]);

  return {
    formData,
    submitting,
    setSubmitting,
    updateField,
    validateForm,
    resetForm,
    getSubmitData,
  };
}