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
      const res = await fetch("/api/auth/login", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error || "Login failed");
      r.push(r.query.next ? String(r.query.next) : "/");
    }catch(e){ setErr(e.message || "Login failed"); }
    finally{ setLoading(false); }
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
  if (req.session.user) return { redirect: { destination: ctx.query.next ? String(ctx.query.next) : "/", permanent: false } };
  return { props: {} };
});
