#!/usr/bin/env bash
set -euo pipefail

echo "==> MoneyCouple auth setup (Prisma Postgres + iron-session)"
echo "    Safe to re-run. Set FORCE=1 to overwrite existing files."

force=${FORCE:-0}

write_file () {
  local path="$1"
  local content="$2"
  if [ -f "$path" ] && [ "$force" != "1" ]; then
    echo " • Exists, skipping: $path   (use FORCE=1 to overwrite)"
  else
    mkdir -p "$(dirname "$path")"
    printf '%s' "$content" > "$path"
    echo " • Wrote: $path"
  fi
}

# -------------------------------------------------------------
# Dependencies
# -------------------------------------------------------------
echo "==> Installing deps (idempotent)…"
npm i iron-session bcryptjs @prisma/client >/dev/null 2>&1 || true
npm i -D prisma >/dev/null 2>&1 || true

# -------------------------------------------------------------
# Files
# -------------------------------------------------------------
write_file prisma/schema.prisma "$(cat <<'PRISMA'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  // Runtime (pooled / Accelerate) – from Vercel Storage
  url       = env("PRISMA_DATABASE_URL")
  // Direct connection for migrations – from Vercel Storage
  directUrl = env("POSTGRES_URL")
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  passwordHash  String
  createdAt     DateTime @default(now())
}
PRISMA
)"

write_file lib/db.js "$(cat <<'DBJS'
import { PrismaClient } from "@prisma/client";
const g = globalThis;
export const prisma = g.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
DBJS
)"

write_file lib/session.js "$(cat <<'SESSION'
import { withIronSessionApiRoute, withIronSessionSsr } from "iron-session/next";
export const sessionOptions = {
  cookieName: "mc_session",
  password: process.env.SECRET_COOKIE_PASSWORD,
  ttl: 60 * 60 * 24 * 30,
  cookieOptions: { secure: process.env.NODE_ENV === "production" },
};
export const withSessionRoute = (h) => withIronSessionApiRoute(h, sessionOptions);
export const withSessionSsr   = (h) => withIronSessionSsr(h, sessionOptions);
SESSION
)"

write_file lib/auth.js "$(cat <<'AUTH'
import { withSessionSsr } from "@/lib/session";
export const requireAuth = (gssp) =>
  withSessionSsr(async (ctx) => {
    const user = ctx.req.session.user;
    if (!user) return { redirect: { destination: "/login", permanent: false } };
    if (typeof gssp === "function") {
      const out = await gssp(ctx, user);
      if ("props" in out) out.props = { ...out.props, user };
      return out;
    }
    return { props: { user } };
  });
AUTH
)"

write_file pages/api/auth/signup.js "$(cat <<'SIGNUP'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
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
  res.json({ ok:true, user: req.session.user });
});
SIGNUP
)"

write_file pages/api/auth/login.js "$(cat <<'LOGIN'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok:false, error:"Email and password required" });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ ok:false, error:"Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ ok:false, error:"Invalid credentials" });
  req.session.user = { id: user.id, email: user.email, name: user.name || user.email };
  await req.session.save();
  res.json({ ok:true, user: req.session.user });
});
LOGIN
)"

write_file pages/api/auth/logout.js "$(cat <<'LOGOUT'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
export default withSessionRoute(async (req, res) => {
  await req.session.destroy();
  res.json({ ok:true });
});
LOGOUT
)"

write_file pages/api/auth/me.js "$(cat <<'ME'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
export default withSessionRoute(async (req, res) => {
  res.json({ user: req.session.user || null });
});
ME
)"

write_file pages/login.jsx "$(cat <<'LOGINPAGE'
import { useState } from "react";
import { useRouter } from "next/router";
import { withSessionSsr } from "@/lib/session";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e){
    e.preventDefault(); setErr(""); setLoading(true);
    try{
      const res = await fetch("/api/auth/login", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ email, password })});
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Login failed");
      r.push("/");
    }catch(e){ setErr(e.message || "Login failed"); } finally { setLoading(false); }
  }

  return (
    <div className="container" style={{maxWidth: 420, paddingTop: 60}}>
      <div className="card">
        <h1>Sign in</h1>
        <form onSubmit={onSubmit} className="column" style={{gap:12}}>
          <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          {err && <div className="pill red">{err}</div>}
          <button className="button" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="muted small" style={{marginTop:10}}>No account? <a href="/signup">Create one</a></p>
      </div>
    </div>
  );
}
export const getServerSideProps = withSessionSsr(async ({ req }) => {
  if (req.session.user) return { redirect: { destination: "/", permanent: false } };
  return { props: {} };
});
LOGINPAGE
)"

write_file pages/signup.jsx "$(cat <<'SIGNUPPAGE'
import { useState } from "react";
import { useRouter } from "next/router";
import { withSessionSsr } from "@/lib/session";

export default function Signup() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e){
    e.preventDefault(); setErr(""); setLoading(true);
    try{
      const res = await fetch("/api/auth/signup", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ email, name, password })});
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Sign up failed");
      r.push("/");
    }catch(e){ setErr(e.message || "Sign up failed"); } finally { setLoading(false); }
  }

  return (
    <div className="container" style={{maxWidth: 420, paddingTop: 60}}>
      <div className="card">
        <h1>Create account</h1>
        <form onSubmit={onSubmit} className="column" style={{gap:12}}>
          <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="input" placeholder="Name (optional)" value={name} onChange={e=>setName(e.target.value)} />
          <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          {err && <div className="pill red">{err}</div>}
          <button className="button" type="submit" disabled={loading}>{loading ? "Creating…" : "Create account"}</button>
        </form>
        <p className="muted small" style={{marginTop:10}}>Already have an account? <a href="/login">Sign in</a></p>
      </div>
    </div>
  );
}
export const getServerSideProps = withSessionSsr(async ({ req }) => {
  if (req.session.user) return { redirect: { destination: "/", permanent: false } };
  return { props: {} };
});
SIGNUPPAGE
)"

# -------------------------------------------------------------
# Protect pages (only if not already done)
# -------------------------------------------------------------
protect_page () {
  local f="$1"; [ -f "$f" ] || return 0
  grep -q "requireAuth" "$f" || sed -i '1i import { requireAuth } from "@/lib/auth";' "$f"
  grep -q "getServerSideProps" "$f" || printf '\nexport const getServerSideProps = requireAuth();\n' >> "$f"
  echo " • Guarded: $f"
}
for p in pages/index.js pages/finance.jsx pages/shopping.jsx pages/savings.jsx pages/projections.jsx pages/settings.jsx; do
  [ -f "$p" ] && protect_page "$p" || true
done

# -------------------------------------------------------------
# package.json scripts (idempotent)
# -------------------------------------------------------------
node - <<'JS'
const fs=require('fs');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
pkg.scripts=pkg.scripts||{};
pkg.scripts.build="prisma migrate deploy && next build";
pkg.scripts.dev=pkg.scripts.dev||"next dev";
pkg.scripts.start=pkg.scripts.start||"next start";
fs.writeFileSync('package.json',JSON.stringify(pkg,null,2));
console.log("==> package.json scripts updated");
JS

# -------------------------------------------------------------
# .env.local template (don’t overwrite without FORCE)
# -------------------------------------------------------------
if [ ! -f .env.local ] || [ "$force" = "1" ]; then
  secret=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  write_file .env.local "$(cat <<EOF
# Paste your Vercel Storage values here (AND add them in Vercel project env)
PRISMA_DATABASE_URL=__PASTE_POOLED_ACCELERATE_URL__
POSTGRES_URL=__PASTE_DIRECT_POSTGRES_URL__

# 32+ char secret (also set the same in Vercel env)
SECRET_COOKIE_PASSWORD=$secret
EOF
)"
fi

# -------------------------------------------------------------
# Prisma generate / migrate (safe, optional)
#   - Runs only if both envs are present in the shell
#   - Skips if migrations already exist
# -------------------------------------------------------------
set +u
source ./.env >/dev/null 2>&1 || true
source ./.env.local >/dev/null 2>&1 || true
set -u

if [[ -n "${PRISMA_DATABASE_URL:-}" && -n "${POSTGRES_URL:-}" ]]; then
  echo "==> Prisma client generate…"
  npx prisma generate >/dev/null
  if [ -d prisma/migrations ] && [ "$(ls -A prisma/migrations 2>/dev/null | wc -l)" -gt 0 ]; then
    echo "==> Migrations already exist; skipping migrate dev."
  else
    echo "==> Running first migration (init_users)…"
    if ! npx prisma migrate dev --name init_users; then
      echo "   (!) Migration failed (likely wrong/missing DB URLs). Fix .env/.env.local and re-run:"
      echo "       npx prisma generate && npx prisma migrate dev --name init_users"
    fi
  fi
else
  echo "NOTE: DB env vars not loaded into the shell. Skipping Prisma steps."
  echo "      Add PRISMA_DATABASE_URL and POSTGRES_URL to .env.local and (optionally) .env for CLI."
fi

echo ""
echo "✅ Done. Next:"
echo "  1) Open .env.local and paste the two DB URLs from Vercel Storage."
echo "  2) Add the SAME three vars in Vercel (Production + Preview):"
echo "       PRISMA_DATABASE_URL, POSTGRES_URL, SECRET_COOKIE_PASSWORD"
echo "  3) Commit & push → Vercel will run 'prisma migrate deploy && next build'."
echo "  4) Visit /signup to create an account."
