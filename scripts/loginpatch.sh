#!/usr/bin/env bash
set -euo pipefail

echo "==> Hardening auth APIs + safer client JSON + health checks"

mkdir -p lib pages/api/health pages/api/auth

# 0) Safe fetch helpers for the client
cat > lib/jfetch.js <<'EOF'
export async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body ?? {})
  });
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();
  let data = null;
  if (ct.includes("application/json") && text) {
    try { data = JSON.parse(text); } catch {}
  }
  if (!res.ok || (data && data.ok === false)) {
    const msg = (data && data.error) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}

export async function getJSON(url) {
  const res = await fetch(url, { credentials: "include" });
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();
  let data = null;
  if (ct.includes("application/json") && text) {
    try { data = JSON.parse(text); } catch {}
  }
  if (!res.ok || (data && data.ok === false)) {
    const msg = (data && data.error) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}
EOF
echo "• lib/jfetch.js"

# 1) Patch auth API routes with try/catch and JSON errors
cat > pages/api/auth/login.js <<'EOF'
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
EOF
echo "• pages/api/auth/login.js"

cat > pages/api/auth/signup.js <<'EOF'
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
EOF
echo "• pages/api/auth/signup.js"

cat > pages/api/auth/logout.js <<'EOF'
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
EOF
echo "• pages/api/auth/logout.js"

cat > pages/api/auth/me.js <<'EOF'
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
EOF
echo "• pages/api/auth/me.js"

# 2) Health endpoints (don’t leak secrets)
cat > pages/api/health/env.js <<'EOF'
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
EOF
echo "• pages/api/health/env.js"

cat > pages/api/health/db.js <<'EOF'
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
EOF
echo "• pages/api/health/db.js"

# 3) Replace login/signup pages to use postJSON()
cat > pages/login.jsx <<'EOF'
import { useState } from "react";
import { useRouter } from "next/router";
import { withSessionSsr } from "@/lib/session";
import { postJSON } from "@/lib/jfetch";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e){
    e.preventDefault(); setErr(""); setLoading(true);
    try{
      await postJSON("/api/auth/login", { email, password });
      r.push(r.query.next ? String(r.query.next) : "/");
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
export const getServerSideProps = withSessionSsr(async (ctx) => {
  if (ctx.req.session.user) return { redirect: { destination: ctx.query.next ? String(ctx.query.next) : "/", permanent: false } };
  return { props: {} };
});
EOF
echo "• pages/login.jsx"

cat > pages/signup.jsx <<'EOF'
import { useState } from "react";
import { useRouter } from "next/router";
import { withSessionSsr } from "@/lib/session";
import { postJSON } from "@/lib/jfetch";

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
      await postJSON("/api/auth/signup", { email, name, password });
      r.push(r.query.next ? String(r.query.next) : "/");
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
export const getServerSideProps = withSessionSsr(async (ctx) => {
  if (ctx.req.session.user) return { redirect: { destination: ctx.query.next ? String(ctx.query.next) : "/", permanent: false } };
  return { props: {} };
});
EOF
echo "• pages/signup.jsx"

echo "==> Done. Commit & push, then test /api/health/env and /api/health/db on Production."
