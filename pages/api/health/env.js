export const config = { runtime: "nodejs" };
export default async function handler(req, res) {
  try {
    const havePooled = !!process.env.PRISMA_DATABASE_URL;
    const haveDirect = !!process.env.POSTGRES_URL;
    const secret = process.env.SECRET_COOKIE_PASSWORD || "";
    const haveSecret = secret.length >= 32;
    return res.json({
      ok: havePooled && haveDirect && haveSecret,
      vars: {
        PRISMA_DATABASE_URL: havePooled,
        POSTGRES_URL: haveDirect,
        SECRET_COOKIE_PASSWORD: haveSecret
      }
    });
  } catch (e) {
    console.error("env health error:", e);
    return res.status(500).json({ ok:false });
  }
}
