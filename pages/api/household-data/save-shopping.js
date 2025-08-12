export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { saveShopping } from "@/lib/household-data";

export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });
  const { items } = req.body || {};
  await saveShopping(me.id, Array.isArray(items) ? items : []);
  res.json({ ok:true });
});
