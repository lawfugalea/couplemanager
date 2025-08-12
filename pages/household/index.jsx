import { requireAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import Link from "next/link";

function Row({ children, style }) {
  return <div className="row" style={{ gap: 10, flexWrap: "wrap", ...style }}>{children}</div>;
}
function Card({ title, children, actions }) {
  return (
    <div className="card" style={{ width: "100%", maxWidth: 900 }}>
      <div className="row" style={{ justifyContent:"space-between", alignItems:"center" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {actions}
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

export default function HouseholdManager() {
  const [loading, setLoading] = useState(true);
  const [meRole, setMeRole] = useState("member");
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [newName, setNewName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [defaults, setDefaults] = useState({ hasMonthly:false, hasExpenses:false, hasSavings:false });
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/household/summary");
    const d = await r.json();
    if (d.ok) {
      setHousehold(d.data.household);
      setMembers(d.data.members || []);
      setMeRole(d.data.role || "member");
      setDefaults(d.data.defaults || {});
      setNewName(d.data.household?.name || "");
    }
    setLoading(false);
  }

  useEffect(() => { load().catch(console.error); }, []);

  async function rename() {
    const r = await fetch("/api/household/rename", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ name: newName })
    });
    const d = await r.json();
    if (!d.ok) return alert(d.error || "Rename failed");
    setMsg("Household renamed"); load();
  }

  async function invite() {
    const r = await fetch("/api/household/invite", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email: inviteEmail || undefined, householdId: household?.id })
    });
    const d = await r.json();
    if (!d.ok) return alert(d.error || "Invite failed");
    setInviteUrl(d.inviteUrl);
    setMsg(inviteEmail ? "Invite email sent (or link ready)" : "Invite link created");
  }

  async function createDefaults() {
    const r = await fetch("/api/household/default-accounts", { method:"POST" });
    const d = await r.json();
    if (!d.ok) return alert(d.error || "Failed");
    setMsg(d.created?.length ? `Created: ${d.created.join(", ")}` : "All defaults already exist");
    load();
  }

  async function setRole(userId, role) {
    const r = await fetch("/api/household/set-role", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ userId, role })
    });
    const d = await r.json();
    if (!d.ok) return alert(d.error || "Role update failed");
    load();
  }

  async function removeMember(userId) {
    if (!confirm("Remove this member?")) return;
    const r = await fetch("/api/household/remove-member", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ userId })
    });
    const d = await r.json();
    if (!d.ok) return alert(d.error || "Remove failed");
    load();
  }

  async function leave() {
    if (!confirm("Leave household?")) return;
    const r = await fetch("/api/household/leave", { method:"POST" });
    const d = await r.json();
    if (!d.ok) return alert(d.error || "Leave failed");
    alert(d.deletedHousehold ? "You left and the household was deleted." : "You left the household.");
    location.href = "/";
  }

  async function deleteHousehold() {
    const text = prompt('Type DELETE to confirm deletion of the entire household (all data).');
    if (text !== "DELETE") return;
    const r = await fetch("/api/household/delete", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ confirm: "DELETE" })
    });
    const d = await r.json();
    if (!d.ok) return alert(d.error || "Delete failed");
    alert("Household deleted."); location.href="/";
  }

  const isOwner = meRole === "owner";

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
      <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
        <Card
          title="Household"
          actions={household && <span className="pill">{isOwner ? "Owner" : "Member"}</span>}
        >
          {loading ? <p className="muted">Loading…</p> : !household ? (
            <>
              <p className="muted">You’re not in a household yet.</p>
              <form onSubmit={async e=>{e.preventDefault(); const r=await fetch('/api/household/create',{method:'POST'}); const d=await r.json(); if(d.ok) load();}}>
                <button className="button" type="submit">Create Household</button>
              </form>
            </>
          ) : (
            <>
              <Row>
                <input className="input" style={{ flex: 1, minWidth: 240 }} value={newName} onChange={e=>setNewName(e.target.value)} disabled={!isOwner} />
                <button className="button" onClick={rename} disabled={!isOwner}>Rename</button>
              </Row>
              {msg && <div className="pill" style={{ marginTop: 12 }}>{msg}</div>}
            </>
          )}
        </Card>

        {household && (
          <>
            <Card title="Members">
              <table className="table" style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign:"left" }}>Name</th>
                    <th style={{ textAlign:"left" }}>Email</th>
                    <th>Role</th>
                    <th style={{ width: 180 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td className="muted">{m.email}</td>
                      <td>
                        {isOwner && !m.isMe ? (
                          <select className="input" value={m.role} onChange={e=>setRole(m.id, e.target.value)} style={{ padding:6 }}>
                            <option value="member">member</option>
                            <option value="owner">owner</option>
                          </select>
                        ) : (
                          <span className="pill">{m.role}</span>
                        )}
                      </td>
                      <td>
                        {m.isMe ? (
                          <button className="button secondary" onClick={leave}>Leave</button>
                        ) : isOwner ? (
                          <button className="button danger" onClick={()=>removeMember(m.id)}>Remove</button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="Invite">
              <Row>
                <input className="input" placeholder="Email (optional)" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} />
                <button className="button" onClick={invite}>Generate Invite</button>
              </Row>
              {inviteUrl && (
                <div className="pill" style={{ marginTop: 12, overflowWrap:"anywhere" }}>
                  Share link: <a href={inviteUrl}>{inviteUrl}</a>
                </div>
              )}
              <p className="muted small" style={{ marginTop:8 }}>
                Email is optional. You can copy the link and send via WhatsApp/SMS. If email is configured, the app emails the link too.
              </p>
            </Card>

            <Card
              title="Default Accounts"
              actions={<Link className="button secondary" href="/finance">Open Finance</Link>}
            >
              <p className="muted small">
                Expected: <strong>Monthly Expense account</strong>, <strong>Expenses account</strong>, <strong>Savings</strong>
              </p>
              <Row>
                <span className="pill" style={{ background: defaults.hasMonthly ? "#dcfce7" : "#fee2e2" }}>
                  Monthly: {defaults.hasMonthly ? "OK" : "Missing"}
                </span>
                <span className="pill" style={{ background: defaults.hasExpenses ? "#dcfce7" : "#fee2e2" }}>
                  Expenses: {defaults.hasExpenses ? "OK" : "Missing"}
                </span>
                <span className="pill" style={{ background: defaults.hasSavings ? "#dcfce7" : "#fee2e2" }}>
                  Savings: {defaults.hasSavings ? "OK" : "Missing"}
                </span>
              </Row>
              <button className="button" style={{ marginTop: 10 }} onClick={createDefaults}>Create missing accounts</button>
            </Card>

            <Card title="Danger Zone">
              <Row>
                <button className="button secondary" onClick={leave}>Leave Household</button>
                {isOwner && (
                  <button className="button danger" onClick={deleteHousehold}>Delete Household</button>
                )}
              </Row>
              <p className="muted small">Deleting wipes all accounts, finance settings, lists and items. No undo.</p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export const getServerSideProps = requireAuth();
