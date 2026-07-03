/**
 * Phone authentication service.
 *
 * This is a mock implementation that always accepts the code "123456"
 * (or any 6-digit code in __DEV__), so the app is usable end-to-end
 * without a backend.
 *
 * To wire up a real provider, replace the two functions below with a
 * concrete implementation. Recommended options:
 *
 *   - Firebase Auth phone provider
 *     https://firebase.google.com/docs/auth/web/phone-auth
 *   - Twilio Verify (via your own thin backend)
 *     https://www.twilio.com/docs/verify/api
 *   - Auth0 SMS passwordless
 *
 * The rest of the app only talks to `requestOtp` and `verifyOtp`, so a
 * drop-in replacement is enough.
 */

export type OtpRequestResult = {
  requestId: string;
  expiresInSec: number;
};

export async function requestOtp(phoneE164: string): Promise<OtpRequestResult> {
  await delay(600);
  if (!phoneE164 || phoneE164.replace(/\D/g, '').length < 10) {
    throw new Error('Please enter a valid phone number.');
  }
  return {
    requestId: `otp_${Date.now()}`,
    expiresInSec: 120,
  };
}

export async function verifyOtp(
  _requestId: string,
  code: string,
): Promise<{ ok: true }> {
  await delay(500);
  const trimmed = code.trim();
  if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
    throw new Error('Enter the 6-digit code you received.');
  }
  // Accept any 6-digit code in the mock. In a real integration, this
  // would validate against Firebase/Twilio.
  return { ok: true };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
