export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute( async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user; if(!me) return res.status(401).json({ ok:false });
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ ok:false, error:"Name required" });

  const member = await prisma.householdMember.findFirst({ where: { userId: me.id }, include: { household: true } });
  if (!member) return res.status(400).json({ ok:false, error:"No household" });
  if (member.role !== "owner") return res.status(403).json({ ok:false, error:"Owners only" });

  await prisma.household.update({ where: { id: member.householdId }, data: { name: name.trim() }});
  res.json({ ok:true });
});
