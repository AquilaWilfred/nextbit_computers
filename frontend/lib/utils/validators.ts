// utils/validators.ts
export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters long";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain a symbol";
  return null;
}

export function validatePhone(phone: string): string | null {
  const kenyanRegex = /^\+254\s[17]\d{2}\s\d{3}\s\d{3}$/;
  const internationalRegex = /^\+\d{1,3}\s\d{3}\s\d{3}\s\d{4}$/;
  if (!kenyanRegex.test(phone) && !internationalRegex.test(phone)) {
    return "Enter a valid phone number, e.g. +254 712 345 678";
  }
  return null;
}