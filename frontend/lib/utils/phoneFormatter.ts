// utils/phoneFormatter.ts
export function formatPhone(value: string, countryCode: string = '+254'): string {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  const selectedCode = countryCode.replace(/\D/g, "");
  const isInternational = raw.startsWith('+');

  if (isInternational) {
    if (digits.startsWith(selectedCode)) {
      return `+${selectedCode}${groupNumber(digits.slice(selectedCode.length))}`.trim();
    }
    return `+${digits}`;
  }

  let local = digits;
  if (digits.startsWith(selectedCode)) {
    local = digits.slice(selectedCode.length);
  } else if (digits.startsWith('0')) {
    local = digits.slice(1);
  }

  return `+${selectedCode}${groupNumber(local)}`.trim();
}

function groupNumber(digits: string): string {
  if (!digits) return "";
  const groups: string[] = [];
  let remaining = digits;

  while (remaining.length > 0) {
    const take = remaining.length > 4 ? 3 : remaining.length;
    groups.push(remaining.slice(0, take));
    remaining = remaining.slice(take);
  }

  return groups.length ? ' ' + groups.join(' ') : '';
}