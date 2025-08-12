export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";

export default withSessionRoute(async (req, res) => {
  try {
    await req.session.destroy();
    return res.json({ ok:true });
  } catch (e) {
    console.error("logout error:", e);
    return res.status(500).json({ ok:false, error:"Server error" });
  }
});
