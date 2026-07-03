import crypto from 'crypto';

/** Generate a numeric OTP of the given length (default 6 digits). */
export function generateOtp(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += crypto.randomInt(0, 10).toString();
  }
  return out;
}

/** Generate a numeric join code for a home game (default 6 digits, no leading zero). */
export function generateJoinCode(length = 6): string {
  const first = crypto.randomInt(1, 10).toString();
  let rest = '';
  for (let i = 1; i < length; i += 1) {
    rest += crypto.randomInt(0, 10).toString();
  }
  return first + rest;
}
