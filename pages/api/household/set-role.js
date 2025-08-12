export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute( async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user; if(!me) return res.status(401).json({ ok:false });
  const { userId, role } = req.body || {};
  if (!userId || !["owner","member"].includes(role)) return res.status(400).json({ ok:false, error:"Bad input" });

  const myM = await prisma.householdMember.findFirst({ where: { userId: me.id }});
  if (!myM) return res.status(400).json({ ok:false, error:"No household" });
  if (myM.role !== "owner") return res.status(403).json({ ok:false, error:"Owners only" });

  // cannot demote yourself via this route
  if (userId === me.id) return res.status(400).json({ ok:false, error:"Use another owner to change your role" });

  await prisma.householdMember.update({
    where: { householdId_userId: { householdId: myM.householdId, userId } },
    data: { role }
  });
  res.json({ ok:true });
});
