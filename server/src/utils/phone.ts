/**
 * Normalize a phone number to a best-effort E.164-like string.
 * This is intentionally lightweight; production apps should use libphonenumber.
 */
export function normalizePhone(input: string, defaultCountryCode = '1'): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^0-9]/g, '');

  if (hasPlus) {
    return `+${digits}`;
  }
  // US/CA style 10-digit number -> prepend default country code.
  if (digits.length === 10) {
    return `+${defaultCountryCode}${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

export function isValidPhone(input: string): boolean {
  const normalized = normalizePhone(input);
  return /^\+[1-9][0-9]{7,14}$/.test(normalized);
}
