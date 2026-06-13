// hooks/auth/useAuthForm.ts
import { useState, useCallback, useMemo } from 'react';
import { FormState } from '@/types/auth.types';
import { validatePassword, validatePhone } from '@/lib/utils/validators';
import { formatPhone } from '@/lib/utils/phoneFormatter';

const initialFormState: FormState = {
  firstName: "", lastName: "", surname: "", phone: "",
  email: "", password: "", confirmPassword: "",
  acceptTerms: false, rememberMe: false, countryCode: '+254',
};

export function useAuthForm(prefillEmail: string = "") {
  const [form, setForm] = useState<FormState>({ ...initialFormState, email: prefillEmail });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const updateField = useCallback((field: keyof FormState, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [fieldErrors]);

  const updatePhone = useCallback((value: string, countryCode: string = '+254') => {
    setForm(prev => ({ ...prev, phone: formatPhone(value, countryCode) }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(initialFormState);
    setFieldErrors({});
  }, []);

  const setFieldError = useCallback((field: string, error: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: error }));
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
    fieldErrors,
    updateField,
    updatePhone,
    setShowPassword,
    resetForm,
    setFieldError,
    validateRegistration,
    getFullName,
  };
}