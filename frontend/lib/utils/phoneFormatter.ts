// utils/phoneFormatter.ts
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";

  // Kenyan number: country code 254 + 9-digit number
  if (digits.startsWith("254") || digits.startsWith("07") || digits.startsWith("01")) {
    let local = digits;
    if (local.startsWith("254")) local = local.slice(3);
    else if (local.startsWith("0")) local = local.slice(1);

    const p1 = local.slice(0, 3);
    const p2 = local.slice(3, 6);
    const p3 = local.slice(6, 9);

    let result = "+254";
    if (p1) result += ` ${p1}`;
    if (p2) result += ` ${p2}`;
    if (p3) result += ` ${p3}`;
    return result;
  }

  // Generic international fallback
  const cc = digits.slice(0, 3);
  const body = digits.slice(3);
  const b1 = body.slice(0, 3);
  const b2 = body.slice(3, 6);
  const b3 = body.slice(6, 10);
  let result = `+${cc}`;
  if (b1) result += ` ${b1}`;
  if (b2) result += ` ${b2}`;
  if (b3) result += ` ${b3}`;
  return result;
}