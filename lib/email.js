import { Resend } from "resend";

/**
 * sendInviteEmail(to, inviteUrl, fromName)
 * - Works only if RESEND_API_KEY is present; otherwise it no-ops.
 */
export async function sendInviteEmail(to, inviteUrl, fromName = "MoneyCouple") {
  if (!process.env.RESEND_API_KEY) return { ok: false, skipped: true };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM || "MoneyCouple <onboarding@resend.dev>";
  try {
    await resend.emails.send({
      from,
      to,
      subject: `${fromName} invited you to their household`,
      html: `<p>You’ve been invited to join a household in MoneyCouple.</p>
             <p><a href="${inviteUrl}">Join household</a></p>`,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}