/**
 * SMS delivery adapter. The default implementation only logs the message so the
 * app is usable without a paid provider. Swap in Twilio (or any other) here.
 */
async function sendSms(to, body) {
  // eslint-disable-next-line no-console
  console.log(`[sms] -> ${to}: ${body}`);
}

module.exports = { sendSms };
