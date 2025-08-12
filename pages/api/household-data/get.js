export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { loadHouseholdBundle } from "@/lib/household-data";

export default withSessionRoute(async (req, res) => {
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });
  const data = await loadHouseholdBundle(me.id);
  res.json({ ok:true, data });
});
