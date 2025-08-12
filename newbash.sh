#!/usr/bin/env bash
set -euo pipefail

echo "==> Fixing session setup (remove iron-session/next dependency)"

# 1) Install or pin iron-session, then clean & reinstall deps
echo "• Installing iron-session"
npm i iron-session@^6.3.1 >/dev/null

echo "• Reinstalling deps fresh"
rm -rf node_modules package-lock.json
npm i >/dev/null

# 2) Replace lib/session.js with a version that does NOT import 'iron-session/next'
mkdir -p lib
cat > lib/session.js <<'EOF'
import { getIronSession } from "iron-session";

/** Single source of truth for session options */
export const sessionOptions = {
  cookieName: "mc_session",
  password: process.env.SECRET_COOKIE_PASSWORD,
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
EOF
echo "• Wrote lib/session.js (no more 'iron-session/next')"

# 3) Quick sanity: ensure SECRET_COOKIE_PASSWORD exists (create placeholder if missing)
if ! grep -q "SECRET_COOKIE_PASSWORD" .env.local 2>/dev/null; then
  echo "• SECRET_COOKIE_PASSWORD missing in .env.local — adding a generated secret"
  mkdir -p .
  secret=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  { echo ""; echo "SECRET_COOKIE_PASSWORD=$secret"; } >> .env.local
fi

# 4) Try a quick compile by running Next in build analyze mode (optional)
echo "==> Done. Now run: npm run dev"
echo "If it still errors, share the fresh logs."
