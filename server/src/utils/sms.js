import { config } from '../config.js';

// Sends an SMS via Twilio when configured. In dev mode (no Twilio creds) it just
// logs the message so the flow can be tested without a phone.
export async function sendSms(to, body) {
  if (!config.twilio.enabled) {
    console.log(`\n[DEV SMS] to ${to}:\n${body}\n`);
    return { delivered: false, dev: true };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`;
  const params = new URLSearchParams({
    To: to,
    From: config.twilio.fromNumber,
    Body: body,
  });
  const auth = Buffer.from(
    `${config.twilio.accountSid}:${config.twilio.authToken}`,
  ).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio error ${res.status}: ${text}`);
  }
  return { delivered: true, dev: false };
}
