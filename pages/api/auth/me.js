export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
export default withSessionRoute(async (req, res) => {
  try {
    return res.json({ ok:true, user: req.session.user || null });
  } catch (e) {
    console.error("me error:", e);
    return res.status(500).json({ ok:false, error:"Server error" });
  }
});
