// hooks/auth/useAuthForm.ts
import { useState, useCallback, useMemo } from 'react';
import { FormState } from '@/types/auth.types';
import { validatePassword, validatePhone } from '@/lib/utils/validators';
import { formatPhone } from '@/lib/utils/phoneFormatter';

const initialFormState: FormState = {
  firstName: "", lastName: "", surname: "", phone: "",
  email: "", password: "", confirmPassword: "",
  acceptTerms: false, rememberMe: false,
};

export function useAuthForm(prefillEmail: string = "") {
  const [form, setForm] = useState<FormState>({ ...initialFormState, email: prefillEmail });
  const [showPassword, setShowPassword] = useState(false);

  const updateField = useCallback((field: keyof FormState, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const updatePhone = useCallback((value: string) => {
    setForm(prev => ({ ...prev, phone: formatPhone(value) }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(initialFormState);
  }, []);

  const validateRegistration = useCallback(() => {
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    const pwdError = validatePassword(form.password);
    if (pwdError) return pwdError;
    const phoneError = validatePhone(form.phone);
    if (phoneError) return phoneError;
    if (!form.acceptTerms) return "Please accept the Terms & Conditions";
    return null;
  }, [form.password, form.confirmPassword, form.phone, form.acceptTerms]);

  const getFullName = useMemo(() => {
    return [form.firstName, form.lastName, form.surname].filter(Boolean).join(" ");
  }, [form.firstName, form.lastName, form.surname]);

  return {
    form,
    showPassword,
    updateField,
    updatePhone,
    setShowPassword,
    resetForm,
    validateRegistration,
    getFullName,
  };
}