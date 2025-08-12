export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute( async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user; if(!me) return res.status(401).json({ ok:false });
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok:false, error:"userId required" });

  const myM = await prisma.householdMember.findFirst({ where: { userId: me.id }});
  if (!myM) return res.status(400).json({ ok:false, error:"No household" });
  if (myM.role !== "owner") return res.status(403).json({ ok:false, error:"Owners only" });

  // don't remove yourself here
  if (userId === me.id) return res.status(400).json({ ok:false, error:"Use /leave to remove yourself" });

  await prisma.householdMember.delete({
    where: { householdId_userId: { householdId: myM.householdId, userId } }
  });
  res.json({ ok:true });
});
