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
