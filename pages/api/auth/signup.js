export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export default withSessionRoute(async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method not allowed" });
    const { email, name, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok:false, error:"Email and password required" });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ ok:false, error:"Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name: name || null, passwordHash },
      select: { id:true, email:true, name:true }
    });

    req.session.user = { id: user.id, email: user.email, name: user.name || user.email };
    await req.session.save();
    return res.json({ ok:true, user: req.session.user });
  } catch (e) {
    console.error("signup error:", e);
    return res.status(500).json({ ok:false, error:"Server error" });
  }
});
