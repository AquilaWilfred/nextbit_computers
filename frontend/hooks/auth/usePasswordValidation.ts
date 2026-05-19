// hooks/usePasswordValidation.ts
import { useState, useCallback } from "react";
import { validatePassword } from "@/lib/utils/validators";

export function usePasswordValidation() {
  const [errors, setErrors] = useState<string[]>([]);

  const validate = useCallback((password: string): boolean => {
    const newErrors: string[] = [];
    if (password.length < 8) newErrors.push("At least 8 characters");
    if (!/[A-Z]/.test(password)) newErrors.push("One uppercase letter");
    if (!/[a-z]/.test(password)) newErrors.push("One lowercase letter");
    if (!/[0-9]/.test(password)) newErrors.push("One number");
    if (!/[^A-Za-z0-9]/.test(password)) newErrors.push("One symbol");
    
    setErrors(newErrors);
    return newErrors.length === 0;
  }, []);

  const getError = useCallback(() => errors[0] || null, [errors]);

  return { validate, errors, getError, isValid: errors.length === 0 };
}