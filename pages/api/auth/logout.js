export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
export default withSessionRoute(async (req, res) => {
  await req.session.destroy();
  res.json({ ok:true });
});
