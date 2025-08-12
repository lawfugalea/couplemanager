export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
export default withSessionRoute(async (req, res) => {
  res.json({ user: req.session.user || null });
});
