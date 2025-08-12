export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { saveAccounts } from "@/lib/household-data";

export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });
  const { accounts } = req.body || {};
  await saveAccounts(me.id, Array.isArray(accounts) ? accounts : []);
  res.json({ ok:true });
});
