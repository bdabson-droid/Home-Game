/**
 * Very lightweight phone normalization. We strip everything except digits and a
 * leading "+". Real deployments should use libphonenumber-js and require the
 * country code up front, but this keeps the demo dependency-light.
 */
function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return (hasPlus ? '+' : '') + digits;
}

module.exports = { normalizePhone };
