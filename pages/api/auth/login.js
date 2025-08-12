export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export default withSessionRoute(async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method not allowed" });
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok:false, error:"Email and password required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ ok:false, error:"Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ ok:false, error:"Invalid credentials" });

    req.session.user = { id: user.id, email: user.email, name: user.name || user.email };
    await req.session.save();
    return res.json({ ok:true, user: req.session.user });
  } catch (e) {
    console.error("login error:", e);
    return res.status(500).json({ ok:false, error:"Server error" });
  }
});
