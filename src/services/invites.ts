/**
 * SMS invite service.
 *
 * Mocked. In production, invites should be sent from a small backend
 * using Twilio, MessageBird, or a similar SMS provider, so you don't
 * expose credentials in the mobile app.
 *
 * The mock resolves successfully and returns the message that *would*
 * have been sent — the UI can then optionally deep-link to the OS share
 * sheet or SMS composer as a fallback.
 */

export type SentInvite = {
  phone: string;
  message: string;
  sentAt: number;
};

export async function sendSmsInvite(params: {
  phoneE164: string;
  gameName: string;
  inviteCode: string;
  hostName: string;
}): Promise<SentInvite> {
  await new Promise((r) => setTimeout(r, 400));
  const message =
    `${params.hostName} invited you to their poker home game "${params.gameName}". ` +
    `Open the Home Game app and join with code ${params.inviteCode}.`;
  return {
    phone: params.phoneE164,
    message,
    sentAt: Date.now(),
  };
}
