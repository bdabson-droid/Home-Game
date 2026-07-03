// Lightweight phone normalization. Keeps a leading + and digits only so that
// invitations by phone number reliably match the account a user signs up with.
export function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;

  // If no country code prefix was provided, default US (+1) for 10-digit numbers.
  if (!hasPlus) {
    if (digits.length === 10) return `+1${digits}`;
    return `+${digits}`;
  }
  return `+${digits}`;
}
