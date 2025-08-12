export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { ensureUserHousehold } from "@/lib/household";

export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const user = req.session.user;
  if (!user) return res.status(401).json({ ok:false });
  const hh = await ensureUserHousehold(user.id);
  res.json({ ok:true, household: hh });
});