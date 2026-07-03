import { config, twilioEnabled } from '../config';

/**
 * Send an SMS. When Twilio credentials are not configured we fall back to
 * logging the message so local development works without external services.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  if (!twilioEnabled) {
    // eslint-disable-next-line no-console
    console.log(`\n[SMS:mock] to=${to}\n${body}\n`);
    return;
  }

  const { accountSid, authToken, fromNumber } = config.twilio;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: fromNumber as string, Body: body });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio send failed (${res.status}): ${text}`);
  }
}
