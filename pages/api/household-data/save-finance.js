export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { saveFinance } from "@/lib/household-data";

export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });
  const { config, currency } = req.body || {};
  await saveFinance(me.id, config ?? {}, currency || "EUR");
  res.json({ ok:true });
});
