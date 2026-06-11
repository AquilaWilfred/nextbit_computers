import { ShippingFormData, OrderTotals } from "@/types/checkout/checkout.types";

export const formatKenyanPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length === 0) return "";

  let cleanNumbers = numbers;
  if (numbers.startsWith("254")) {
    cleanNumbers = numbers.slice(3);
  } else if (numbers.startsWith("0")) {
    cleanNumbers = numbers.slice(1);
  }

  const truncated = cleanNumbers.slice(0, 9);
  const prefix = truncated.slice(0, 3);
  const firstPart = truncated.slice(3, 6);
  const secondPart = truncated.slice(6, 9);

  let res = "+254";
  if (truncated.length > 0) res += ` ${prefix}`;
  if (truncated.length > 3) res += ` ${firstPart}`;
  if (truncated.length > 6) res += ` ${secondPart}`;
  
  return res;
};

export const validateShippingForm = (data: ShippingFormData, isAuthenticated: boolean): boolean => {
  return !!(
    data.firstName &&
    data.lastName &&
    (!isAuthenticated ? data.email : true) &&
    data.phone &&
    data.address &&
    data.city &&
    data.country
  );
};

export const calculateOrderTotals = (
  subtotal: number,
  isExpress: boolean,
  freeThreshold: number,
  standardFee: number,
  expressFee: number,
  discountAmount: number = 0
): { baseShipping: number; shippingCost: number; total: number } => {
  const baseShipping = subtotal >= freeThreshold ? 0 : standardFee;
  const shippingCost = isExpress ? expressFee : baseShipping;
  const total = Math.max(0, subtotal + shippingCost - discountAmount);
  
  return { baseShipping, shippingCost, total };
};