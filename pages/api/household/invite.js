export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserHouseholds, userIsInHousehold } from "@/lib/household";
import { sendInviteEmail } from "@/lib/email";
import crypto from "crypto";

/**
 * Body: { householdId?: string, email?: string }
 * - If householdId omitted, use the first household the user belongs to.
 * - Returns { ok:true, inviteUrl, token }
 * - If RESEND_API_KEY is set and email provided, sends the email too.
 */
export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });

  const { email, householdId } = req.body || {};
  let hhId = householdId;
  if (!hhId) {
    const hhs = await getUserHouseholds(me.id);
    if (!hhs.length) return res.status(400).json({ ok:false, error:"You have no household. Create one first." });
    hhId = hhs[0].id;
  }

  if (!(await userIsInHousehold(me.id, hhId))) {
    return res.status(403).json({ ok:false, error:"Not your household" });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7*24*60*60*1000); // 7 days
  const invite = await prisma.invite.create({
    data: {
      token,
      householdId: hhId,
      email: email || null,
      createdByUserId: me.id,
      expiresAt,
    }
  });

  const base = process.env.BASE_URL || `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
  const inviteUrl = `${base}/household/join/${invite.token}`;

  if (email) {
    const sent = await sendInviteEmail(email, inviteUrl, me.name || me.email);
    if (!sent.ok && !sent.skipped) {
      return res.status(500).json({ ok:false, error:"Failed to send email", inviteUrl });
    }
  }

  res.json({ ok:true, inviteUrl, token });
});