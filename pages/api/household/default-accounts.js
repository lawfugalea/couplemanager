export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute( async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user; if(!me) return res.status(401).json({ ok:false });

  const myMember = await prisma.householdMember.findFirst({ where: { userId: me.id }});
  if (!myMember) return res.status(400).json({ ok:false, error:"No household" });

  const existing = await prisma.account.findMany({ where: { householdId: myMember.householdId }});
  const want = [
    { name: "Monthly Expense account", kind: "monthly" },
    { name: "Expenses account",       kind: "expenses" },
    { name: "Savings",                kind: "savings" },
  ];
  const toCreate = want.filter(w => !existing.some(e => e.kind === w.kind));
  if (toCreate.length) {
    await prisma.account.createMany({
      data: toCreate.map(t => ({ householdId: myMember.householdId, name: t.name, kind: t.kind }))
    });
  }
  res.json({ ok:true, created: toCreate.map(t=>t.kind) });
});
