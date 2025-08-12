export const config = { runtime: "nodejs" };
import { prisma } from "@/lib/db";
export default async function handler(req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ ok:true });
  } catch (e) {
    console.error("db health error:", e);
    return res.status(500).json({ ok:false, error: e.message });
  }
}
