export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ ok:false, error:"Missing token" });

  const inv = await prisma.invite.findUnique({ where: { token } });
  if (!inv) return res.status(404).json({ ok:false, error:"Invalid invite" });
  if (new Date(inv.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({ ok:false, error:"Invite expired" });
  }

  // Upsert membership
  await prisma.householdMember.upsert({
    where: { householdId_userId: { householdId: inv.householdId, userId: me.id } },
    update: {},
    create: { householdId: inv.householdId, userId: me.id, role: "member" },
  });

  // (Optional) delete or keep invite; we’ll keep it until expiry
  res.json({ ok:true, householdId: inv.householdId });
});