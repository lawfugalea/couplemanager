export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute(async (req, res) => {
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });

  const myMember = await prisma.householdMember.findFirst({
    where: { userId: me.id },
    include: { household: true },
  });

  if (!myMember) {
    return res.json({ ok:true, data: { household: null, members: [], role: null } });
  }

  const members = await prisma.householdMember.findMany({
    where: { householdId: myMember.householdId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  // Check which default accounts exist
  const accounts = await prisma.account.findMany({
    where: { householdId: myMember.householdId }
  });
  const hasMonthly  = accounts.some(a => a.kind === "monthly");
  const hasExpenses = accounts.some(a => a.kind === "expenses");
  const hasSavings  = accounts.some(a => a.kind === "savings");

  res.json({
    ok:true,
    data: {
      household: { id: myMember.household.id, name: myMember.household.name },
      members: members.map(m => ({
        id: m.user.id,
        name: m.user.name || m.user.email,
        email: m.user.email,
        role: m.role,
        isMe: m.userId === me.id
      })),
      role: members.find(m => m.userId === me.id)?.role || "member",
      defaults: { hasMonthly, hasExpenses, hasSavings }
    }
  });
});
