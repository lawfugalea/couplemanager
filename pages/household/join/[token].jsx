import { requireAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Join({ token }) {
  const r = useRouter();
  const [msg, setMsg] = useState("Joining…");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/household/accept", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.ok) { setMsg("Success! Redirecting…"); setTimeout(()=> r.replace("/household"), 800); }
      else setMsg(data.error || "Join failed");
    })();
  }, [token]);

  return (
    <div className="container">
      <div className="card">
        <h1>Join Household</h1>
        <p>{msg}</p>
      </div>
    </div>
  );
}

/** If not logged in, go to login with ?next=/household/join/<token> */
export const getServerSideProps = requireAuth(async (ctx) => {
  const token = ctx.params.token;
  return { props: { token } };
});