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
    e.preventDefault(); 
    setErr(""); 
    setLoading(true);
    
    try{
      await postJSON("/api/auth/login", { email, password });
      r.push(r.query.next ? String(r.query.next) : "/");
    } catch(e) { 
      setErr(e.message || "Login failed"); 
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ 
      background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--secondary-500) 100%)',
      padding: 'var(--space-6)'
    }}>
      <div className="card animate-fade-in" style={{ maxWidth: '420px', width: '100%' }}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-secondary">Sign in to your MoneyCouple account</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              className="form-input" 
              type="email"
              placeholder="Enter your email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              className="form-input" 
              type="password"
              placeholder="Enter your password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {err && (
            <div className="alert alert-error">
              {err}
            </div>
          )}

          <button 
            className="btn btn-primary w-full btn-lg" 
            type="submit" 
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-pulse">⏳</div>
                Signing in...
              </>
            ) : (
              <>
                🔐 Sign In
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-secondary text-sm">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary-600 font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = withSessionSsr(async (ctx) => {
  if (ctx.req.session.user) {
    return { 
      redirect: { 
        destination: ctx.query.next ? String(ctx.query.next) : "/", 
        permanent: false 
      } 
    };
  }
  return { props: {} };
});