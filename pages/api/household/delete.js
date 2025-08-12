export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute( async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user; if(!me) return res.status(401).json({ ok:false });
  const { confirm } = req.body || {};
  if (confirm !== "DELETE") return res.status(400).json({ ok:false, error:'Type DELETE to confirm' });

  const m = await prisma.householdMember.findFirst({
    where: { userId: me.id },
    include: { household: { include: { members: true } } }
  });
  if (!m) return res.status(400).json({ ok:false, error:"No household" });
  if (m.role !== "owner") return res.status(403).json({ ok:false, error:"Owners only" });

  // wipe data
  await prisma.shoppingItem.deleteMany({ where: { list: { householdId: m.householdId } } });
  await prisma.shoppingList.deleteMany({ where: { householdId: m.householdId } });
  await prisma.account.deleteMany({ where: { householdId: m.householdId } });
  await prisma.financeSettings.deleteMany({ where: { householdId: m.householdId } });
  await prisma.invite.deleteMany({ where: { householdId: m.householdId } });
  await prisma.householdMember.deleteMany({ where: { householdId: m.householdId } });
  await prisma.household.delete({ where: { id: m.householdId } });

  res.json({ ok:true, deleted: true });
});
