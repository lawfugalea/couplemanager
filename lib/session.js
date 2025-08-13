import { getIronSession } from "iron-session";

// Ensure we have a valid password
const password = process.env.SECRET_COOKIE_PASSWORD;
if (!password || password.length < 32) {
  throw new Error(
    `SECRET_COOKIE_PASSWORD must be at least 32 characters long. ` +
    `Current length: ${password?.length || 0}. ` +
    `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  );
}

/** Single source of truth for session options */
export const sessionOptions = {
  cookieName: "mc_session",
  password: password,
  ttl: 60 * 60 * 24 * 30, // 30 days
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
  },
};

/** Wrap API route: gives you req.session (get/set/destroy) */
export function withSessionRoute(handler) {
  return async (req, res) => {
    req.session = await getIronSession(req, res, sessionOptions);
    return handler(req, res);
  };
}

/** Wrap getServerSideProps: gives you req.session on ctx.req */
export function withSessionSsr(handler) {
  return async (ctx) => {
    ctx.req.session = await getIronSession(ctx.req, ctx.res, sessionOptions);
    return handler(ctx);
  };
}
