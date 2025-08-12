#!/usr/bin/env bash
set -euo pipefail
echo "==> Adding Households + Invites (share-by-link or optional email)"

FORCE=${FORCE:-0}

write_file () {
  local path="$1"
  local content="$2"
  if [ -f "$path" ] && [ "$FORCE" != "1" ]; then
    echo " • Exists, skipping: $path   (use FORCE=1 to overwrite)"
  else
    mkdir -p "$(dirname "$path")"
    printf '%s' "$content" > "$path"
    echo " • Wrote: $path"
  fi
}

# Deps (Resend is optional for emailing)
npm i @prisma/client resend >/dev/null 2>&1 || true
npm i -D prisma >/dev/null 2>&1 || true

# ---------- Prisma schema (adds households & invites) ----------
write_file prisma/schema.prisma "$(cat <<'PRISMA'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("PRISMA_DATABASE_URL")
  directUrl = env("POSTGRES_URL")
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  passwordHash  String
  createdAt     DateTime @default(now())
  // Relations
  members       HouseholdMember[]
}

model Household {
  id         String   @id @default(cuid())
  name       String
  createdAt  DateTime @default(now())
  members    HouseholdMember[]
  invites    Invite[]
}

model HouseholdMember {
  id           String     @id @default(cuid())
  householdId  String
  userId       String
  role         String     @default("member")
  createdAt    DateTime   @default(now())
  household    Household  @relation(fields: [householdId], references: [id])
  user         User       @relation(fields: [userId], references: [id])

  @@unique([householdId, userId])
}

model Invite {
  id              String     @id @default(cuid())
  token           String     @unique
  householdId     String
  email           String?
  createdByUserId String
  expiresAt       DateTime
  createdAt       DateTime   @default(now())
  household       Household  @relation(fields: [householdId], references: [id])
}
PRISMA
)"

# ---------- Helpers ----------
write_file lib/household.js "$(cat <<'HJS'
import { prisma } from "@/lib/db";

/** Get (or create) the first household for a user */
export async function ensureUserHousehold(userId, name = "Family") {
  const existing = await prisma.householdMember.findFirst({
    where: { userId },
    include: { household: true },
  });
  if (existing) return existing.household;

  const household = await prisma.household.create({
    data: {
      name,
      members: {
        create: { userId, role: "owner" },
      },
    },
  });
  return household;
}

export async function getUserHouseholds(userId) {
  const rows = await prisma.householdMember.findMany({
    where: { userId },
    include: { household: true },
  });
  return rows.map(r => r.household);
}

export async function userIsInHousehold(userId, householdId) {
  const m = await prisma.householdMember.findFirst({ where: { userId, householdId } });
  return !!m;
}
HJS
)"

write_file lib/email.js "$(cat <<'EMAIL'
import { Resend } from "resend";

/**
 * sendInviteEmail(to, inviteUrl, fromName)
 * - Works only if RESEND_API_KEY is present; otherwise it no-ops.
 */
export async function sendInviteEmail(to, inviteUrl, fromName = "MoneyCouple") {
  if (!process.env.RESEND_API_KEY) return { ok: false, skipped: true };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM || "MoneyCouple <onboarding@resend.dev>";
  try {
    await resend.emails.send({
      from,
      to,
      subject: `${fromName} invited you to their household`,
      html: `<p>You’ve been invited to join a household in MoneyCouple.</p>
             <p><a href="${inviteUrl}">Join household</a></p>`,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}
EMAIL
)"

# ---------- APIs ----------
mkdir -p pages/api/household

write_file pages/api/household/create.js "$(cat <<'API_CREATE'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { ensureUserHousehold } from "@/lib/household";

export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const user = req.session.user;
  if (!user) return res.status(401).json({ ok:false });
  const hh = await ensureUserHousehold(user.id);
  res.json({ ok:true, household: hh });
});
API_CREATE
)"

write_file pages/api/household/invite.js "$(cat <<'API_INVITE'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserHouseholds, userIsInHousehold } from "@/lib/household";
import { sendInviteEmail } from "@/lib/email";
import crypto from "crypto";

/**
 * Body: { householdId?: string, email?: string }
 * - If householdId omitted, use the first household the user belongs to.
 * - Returns { ok:true, inviteUrl, token }
 * - If RESEND_API_KEY is set and email provided, sends the email too.
 */
export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });

  const { email, householdId } = req.body || {};
  let hhId = householdId;
  if (!hhId) {
    const hhs = await getUserHouseholds(me.id);
    if (!hhs.length) return res.status(400).json({ ok:false, error:"You have no household. Create one first." });
    hhId = hhs[0].id;
  }

  if (!(await userIsInHousehold(me.id, hhId))) {
    return res.status(403).json({ ok:false, error:"Not your household" });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7*24*60*60*1000); // 7 days
  const invite = await prisma.invite.create({
    data: {
      token,
      householdId: hhId,
      email: email || null,
      createdByUserId: me.id,
      expiresAt,
    }
  });

  const base = process.env.BASE_URL || `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
  const inviteUrl = `${base}/household/join/${invite.token}`;

  if (email) {
    const sent = await sendInviteEmail(email, inviteUrl, me.name || me.email);
    if (!sent.ok && !sent.skipped) {
      return res.status(500).json({ ok:false, error:"Failed to send email", inviteUrl });
    }
  }

  res.json({ ok:true, inviteUrl, token });
});
API_INVITE
)"

write_file pages/api/household/accept.js "$(cat <<'API_ACCEPT'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { prisma } from "@/lib/db";

export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ ok:false, error:"Missing token" });

  const inv = await prisma.invite.findUnique({ where: { token } });
  if (!inv) return res.status(404).json({ ok:false, error:"Invalid invite" });
  if (new Date(inv.expiresAt).getTime() < Date.now()) {
    return res.status(410).json({ ok:false, error:"Invite expired" });
  }

  // Upsert membership
  await prisma.householdMember.upsert({
    where: { householdId_userId: { householdId: inv.householdId, userId: me.id } },
    update: {},
    create: { householdId: inv.householdId, userId: me.id, role: "member" },
  });

  // (Optional) delete or keep invite; we’ll keep it until expiry
  res.json({ ok:true, householdId: inv.householdId });
});
API_ACCEPT
)"

# ---------- Pages ----------
mkdir -p pages/household pages/household/join

write_file pages/household/index.jsx "$(cat <<'HH_PAGE'
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { useState } from "react";

export default function Household({ household, members }) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  async function create() {
    const r = await fetch("/api/household/create", { method:"POST" });
    const d = await r.json(); if(d.ok) location.reload();
  }
  async function invite() {
    const r = await fetch("/api/household/invite", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email: email || undefined, householdId: household?.id })
    });
    const d = await r.json();
    if (d.ok) setInviteUrl(d.inviteUrl);
    else alert(d.error || "Failed to create invite");
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Household</h1>
        {!household ? (
          <>
            <p className="muted">You don’t belong to a household yet.</p>
            <button className="button" onClick={create}>Create household</button>
          </>
        ) : (
          <>
            <p><strong>{household.name}</strong></p>
            <h3>Members</h3>
            <ul className="list">
              {members.map(m => <li key={m.id} className="list-item">{m.name || m.email}</li>)}
            </ul>
            <div className="space" />
            <h3>Invite someone</h3>
            <div className="row">
              <input className="input" placeholder="Email (optional)" value={email} onChange={e=>setEmail(e.target.value)} />
              <button className="button" onClick={invite}>Generate invite</button>
            </div>
            {inviteUrl && (
              <>
                <div className="space" />
                <div className="pill">Share this link: <a href={inviteUrl}>{inviteUrl}</a></div>
                <p className="muted small">You can paste this in WhatsApp/SMS. If email is set up, an email was sent.</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export const getServerSideProps = requireAuth(async ({ req }) => {
  const me = req.session.user;
  const member = await prisma.householdMember.findFirst({
    where: { userId: me.id },
    include: { household: true },
  });
  if (!member) return { props: { household: null, members: [] } };

  const members = await prisma.householdMember.findMany({
    where: { householdId: member.householdId },
    include: { user: true },
  });

  return {
    props: {
      household: { id: member.household.id, name: member.household.name },
      members: members.map(m => ({ id: m.user.id, name: m.user.name, email: m.user.email })),
    }
  };
});
HH_PAGE
)"

write_file pages/household/join/[token].jsx "$(cat <<'JOIN_PAGE'
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
JOIN_PAGE
)"

# ---------- Patch login/signup for ?next= redirect ----------
patch_next_page () {
  local file="$1"
  [ -f "$file" ] || return 0
  node - <<JS
const fs=require('fs');
const p="$file";
let s=fs.readFileSync(p,'utf8');
// Ensure uses `next` param after success:
s=s.replace(/r\.push\("\/"\)/g, 'r.push(r.query.next ? String(r.query.next) : "/")');
// Ensure SSR respects next if already logged in:
s=s.replace(/return \{ redirect: \{ destination: "\/", permanent: false \} \}/,
             'return { redirect: { destination: ctx.query.next ? String(ctx.query.next) : "/", permanent: false } }');
fs.writeFileSync(p,s);
console.log("• Patched next-redirect in", p);
JS
}
patch_next_page pages/login.jsx || true
patch_next_page pages/signup.jsx || true

echo "==> Attempting Prisma generate & migration (needs .env/.env.local with DB URLs)"
set +u
source ./.env >/dev/null 2>&1 || true
source ./.env.local >/dev/null 2>&1 || true
set -u

if [[ -n "${PRISMA_DATABASE_URL:-}" && -n "${POSTGRES_URL:-}" ]]; then
  npx prisma generate >/dev/null
  npx prisma migrate dev --name households_and_invites
else
  echo "NOTE: PRISMA_DATABASE_URL/POSTGRES_URL not loaded; skipping migrate."
  echo "      After you add them, run:"
  echo "         npx prisma generate && npx prisma migrate dev --name households_and_invites"
fi

echo ""
echo "✅ Households + Invites ready."
echo "Open /household to create/invite. Invite links work even without email."
echo "Optional email: set RESEND_API_KEY (and RESEND_FROM) in env; the API will send."
