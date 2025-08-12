export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute( async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user; if(!me) return res.status(401).json({ ok:false });

  const m = await prisma.householdMember.findFirst({
    where: { userId: me.id },
    include: { household: { include: { members: true } } }
  });
  if (!m) return res.status(400).json({ ok:false, error:"No household" });

  const owners = m.household.members.filter(x => x.role === "owner");
  const others = m.household.members.filter(x => x.userId !== me.id);

  if (m.role === "owner" && owners.length === 1 && others.length > 0) {
    return res.status(400).json({ ok:false, error:"Transfer ownership before leaving" });
  }

  // If last member, clean up everything
  if (others.length === 0) {
    await prisma.shoppingItem.deleteMany({ where: { list: { householdId: m.householdId } } });
    await prisma.shoppingList.deleteMany({ where: { householdId: m.householdId } });
    await prisma.account.deleteMany({ where: { householdId: m.householdId } });
    await prisma.financeSettings.deleteMany({ where: { householdId: m.householdId } });
    await prisma.invite.deleteMany({ where: { householdId: m.householdId } });
    await prisma.householdMember.deleteMany({ where: { householdId: m.householdId } });
    await prisma.household.delete({ where: { id: m.householdId } });
    return res.json({ ok:true, deletedHousehold: true });
  }

  await prisma.householdMember.delete({
    where: { householdId_userId: { householdId: m.householdId, userId: me.id } }
  });

  res.json({ ok:true });
});
