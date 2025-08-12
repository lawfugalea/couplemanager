#!/usr/bin/env bash
set -euo pipefail
echo "==> Adding Household Manager page + APIs"

# tiny helper
write () { mkdir -p "$(dirname "$1")"; cat > "$1" <<'EOF'
$2
EOF
}

# 1) APIs
mkdir -p pages/api/household

# Summarize household + members
cat > pages/api/household/summary.js <<'EOF'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute(async (req, res) => {
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });

  const myMember = await prisma.householdMember.findFirst({
    where: { userId: me.id },
    include: { household: true },
  });

  if (!myMember) {
    return res.json({ ok:true, data: { household: null, members: [], role: null } });
  }

  const members = await prisma.householdMember.findMany({
    where: { householdId: myMember.householdId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  // Check which default accounts exist
  const accounts = await prisma.account.findMany({
    where: { householdId: myMember.householdId }
  });
  const hasMonthly  = accounts.some(a => a.kind === "monthly");
  const hasExpenses = accounts.some(a => a.kind === "expenses");
  const hasSavings  = accounts.some(a => a.kind === "savings");

  res.json({
    ok:true,
    data: {
      household: { id: myMember.household.id, name: myMember.household.name },
      members: members.map(m => ({
        id: m.user.id,
        name: m.user.name || m.user.email,
        email: m.user.email,
        role: m.role,
        isMe: m.userId === me.id
      })),
      role: members.find(m => m.userId === me.id)?.role || "member",
      defaults: { hasMonthly, hasExpenses, hasSavings }
    }
  });
});
EOF

# Rename household (owner only)
cat > pages/api/household/rename.js <<'EOF'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute( async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user; if(!me) return res.status(401).json({ ok:false });
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ ok:false, error:"Name required" });

  const member = await prisma.householdMember.findFirst({ where: { userId: me.id }, include: { household: true } });
  if (!member) return res.status(400).json({ ok:false, error:"No household" });
  if (member.role !== "owner") return res.status(403).json({ ok:false, error:"Owners only" });

  await prisma.household.update({ where: { id: member.householdId }, data: { name: name.trim() }});
  res.json({ ok:true });
});
EOF

# Create default accounts if missing (owner or member, doesn't matter)
cat > pages/api/household/default-accounts.js <<'EOF'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute( async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user; if(!me) return res.status(401).json({ ok:false });

  const myMember = await prisma.householdMember.findFirst({ where: { userId: me.id }});
  if (!myMember) return res.status(400).json({ ok:false, error:"No household" });

  const existing = await prisma.account.findMany({ where: { householdId: myMember.householdId }});
  const want = [
    { name: "Monthly Expense account", kind: "monthly" },
    { name: "Expenses account",       kind: "expenses" },
    { name: "Savings",                kind: "savings" },
  ];
  const toCreate = want.filter(w => !existing.some(e => e.kind === w.kind));
  if (toCreate.length) {
    await prisma.account.createMany({
      data: toCreate.map(t => ({ householdId: myMember.householdId, name: t.name, kind: t.kind }))
    });
  }
  res.json({ ok:true, created: toCreate.map(t=>t.kind) });
});
EOF

# Change role (owner only)
cat > pages/api/household/set-role.js <<'EOF'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute( async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user; if(!me) return res.status(401).json({ ok:false });
  const { userId, role } = req.body || {};
  if (!userId || !["owner","member"].includes(role)) return res.status(400).json({ ok:false, error:"Bad input" });

  const myM = await prisma.householdMember.findFirst({ where: { userId: me.id }});
  if (!myM) return res.status(400).json({ ok:false, error:"No household" });
  if (myM.role !== "owner") return res.status(403).json({ ok:false, error:"Owners only" });

  // cannot demote yourself via this route
  if (userId === me.id) return res.status(400).json({ ok:false, error:"Use another owner to change your role" });

  await prisma.householdMember.update({
    where: { householdId_userId: { householdId: myM.householdId, userId } },
    data: { role }
  });
  res.json({ ok:true });
});
EOF

# Remove member (owner only)
cat > pages/api/household/remove-member.js <<'EOF'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute( async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user; if(!me) return res.status(401).json({ ok:false });
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok:false, error:"userId required" });

  const myM = await prisma.householdMember.findFirst({ where: { userId: me.id }});
  if (!myM) return res.status(400).json({ ok:false, error:"No household" });
  if (myM.role !== "owner") return res.status(403).json({ ok:false, error:"Owners only" });

  // don't remove yourself here
  if (userId === me.id) return res.status(400).json({ ok:false, error:"Use /leave to remove yourself" });

  await prisma.householdMember.delete({
    where: { householdId_userId: { householdId: myM.householdId, userId } }
  });
  res.json({ ok:true });
});
EOF

# Leave household (member or owner). If sole owner with other members, block.
cat > pages/api/household/leave.js <<'EOF'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute( async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user; if(!me) return res.status(401).json({ ok:false });

  const m = await prisma.householdMember.findFirst({
    where: { userId: me.id },
    include: { household: { include: { members: true } } }
  });
  if (!m) return res.status(400).json({ ok:false, error:"No household" });

  const owners = m.household.members.filter(x => x.role === "owner");
  const others = m.household.members.filter(x => x.userId !== me.id);

  if (m.role === "owner" && owners.length === 1 && others.length > 0) {
    return res.status(400).json({ ok:false, error:"Transfer ownership before leaving" });
  }

  // If last member, clean up everything
  if (others.length === 0) {
    await prisma.shoppingItem.deleteMany({ where: { list: { householdId: m.householdId } } });
    await prisma.shoppingList.deleteMany({ where: { householdId: m.householdId } });
    await prisma.account.deleteMany({ where: { householdId: m.householdId } });
    await prisma.financeSettings.deleteMany({ where: { householdId: m.householdId } });
    await prisma.invite.deleteMany({ where: { householdId: m.householdId } });
    await prisma.householdMember.deleteMany({ where: { householdId: m.householdId } });
    await prisma.household.delete({ where: { id: m.householdId } });
    return res.json({ ok:true, deletedHousehold: true });
  }

  await prisma.householdMember.delete({
    where: { householdId_userId: { householdId: m.householdId, userId: me.id } }
  });

  res.json({ ok:true });
});
EOF

# Delete household (owner only, dangerous)
cat > pages/api/household/delete.js <<'EOF'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute( async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user; if(!me) return res.status(401).json({ ok:false });
  const { confirm } = req.body || {};
  if (confirm !== "DELETE") return res.status(400).json({ ok:false, error:'Type DELETE to confirm' });

  const m = await prisma.householdMember.findFirst({
    where: { userId: me.id },
    include: { household: { include: { members: true } } }
  });
  if (!m) return res.status(400).json({ ok:false, error:"No household" });
  if (m.role !== "owner") return res.status(403).json({ ok:false, error:"Owners only" });

  // wipe data
  await prisma.shoppingItem.deleteMany({ where: { list: { householdId: m.householdId } } });
  await prisma.shoppingList.deleteMany({ where: { householdId: m.householdId } });
  await prisma.account.deleteMany({ where: { householdId: m.householdId } });
  await prisma.financeSettings.deleteMany({ where: { householdId: m.householdId } });
  await prisma.invite.deleteMany({ where: { householdId: m.householdId } });
  await prisma.householdMember.deleteMany({ where: { householdId: m.householdId } });
  await prisma.household.delete({ where: { id: m.householdId } });

  res.json({ ok:true, deleted: true });
});
EOF

# 2) Page UI (Household Manager)
mkdir -p pages/household
cat > pages/household/index.jsx <<'EOF'
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
EOF

echo "==> Done. Start dev server and open /household"
echo "npm run dev"
