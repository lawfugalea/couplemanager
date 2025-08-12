#!/usr/bin/env bash
set -euo pipefail
echo "==> Household data: Accounts + FinanceSettings + Shopping (per-household)"

# Idempotent file writer
write_file () {
  local path="$1"
  local content="$2"
  mkdir -p "$(dirname "$path")"
  printf '%s' "$content" > "$path"
  echo " • Wrote: $path"
}

append_if_missing () {
  local file="$1"
  local pattern="$2"
  local block="$3"
  if grep -q "$pattern" "$file" 2>/dev/null; then
    echo " • Exists, skipping block in $file ($pattern)"
  else
    printf '\n%s\n' "$block" >> "$file"
    echo " • Appended block to $file"
  fi
}

echo "==> Installing Prisma client (if needed)"
npm i @prisma/client >/dev/null 2>&1 || true
npm i -D prisma >/dev/null 2>&1 || true

echo "==> Extending Prisma schema with household-scoped models"
[ -f prisma/schema.prisma ] || { echo " !! prisma/schema.prisma not found. Run the previous auth/household setup first."; exit 1; }

ACCOUNT_BLOCK='
model Account {
  id          String   @id @default(cuid())
  householdId String
  name        String
  kind        String   // "monthly" | "expenses" | "savings" | other
  balance     Decimal? @db.Decimal(12,2)
  goal        Decimal? @db.Decimal(12,2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  household   Household @relation(fields: [householdId], references: [id])
  @@index([householdId])
}
'

FINANCE_BLOCK='
model FinanceSettings {
  id          String   @id @default(cuid())
  householdId String   @unique
  currency    String   @default("EUR")
  // Free-form JSON for now: incomes, split method, targets, etc.
  config      Json?
  updatedAt   DateTime @updatedAt
  household   Household @relation(fields: [householdId], references: [id])
}
'

SHOPPING_BLOCK='
model ShoppingList {
  id          String   @id @default(cuid())
  householdId String
  name        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  items       ShoppingItem[]
  household   Household @relation(fields: [householdId], references: [id])
  @@unique([householdId, name])
}

model ShoppingItem {
  id          String   @id @default(cuid())
  listId      String
  name        String
  qty         String?  // keep as text (e.g., "2", "1kg")
  category    String?
  notes       String?
  checked     Boolean  @default(false)
  price       Decimal? @db.Decimal(12,2)
  store       String?
  updatedAt   DateTime @updatedAt
  list        ShoppingList @relation(fields: [listId], references: [id])
  @@index([listId])
}
'

append_if_missing prisma/schema.prisma 'model Account {' "$ACCOUNT_BLOCK"
append_if_missing prisma/schema.prisma 'model FinanceSettings {' "$FINANCE_BLOCK"
append_if_missing prisma/schema.prisma 'model ShoppingList {' "$SHOPPING_BLOCK"

echo "==> DB helper (already present? fine)"
cat > lib/db.js <<'EOF'
import { PrismaClient } from "@prisma/client";
const g = globalThis;
export const prisma = g.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
EOF

echo "==> Household helpers (ensure default household, etc.)"
cat > lib/household-data.js <<'EOF'
import { prisma } from "@/lib/db";
import { ensureUserHousehold } from "@/lib/household";

/** Load household data (accounts, finance, shopping items) */
export async function loadHouseholdBundle(userId) {
  const hh = await ensureUserHousehold(userId);
  // Ensure default list exists
  let list = await prisma.shoppingList.findFirst({
    where: { householdId: hh.id, name: "Groceries" }
  });
  if (!list) {
    list = await prisma.shoppingList.create({
      data: { householdId: hh.id, name: "Groceries" }
    });
  }

  const [accounts, finance, items] = await Promise.all([
    prisma.account.findMany({ where: { householdId: hh.id }, orderBy: { name: "asc" } }),
    prisma.financeSettings.findUnique({ where: { householdId: hh.id } }),
    prisma.shoppingItem.findMany({ where: { listId: list.id }, orderBy: { updatedAt: "desc" } }),
  ]);

  return {
    household: { id: hh.id, name: hh.name },
    accounts,
    finance: finance || null,
    shopping: { listId: list.id, name: list.name, items },
  };
}

/** Replace all accounts for a household with the provided array */
export async function saveAccounts(userId, accounts) {
  const hh = await ensureUserHousehold(userId);
  await prisma.account.deleteMany({ where: { householdId: hh.id } });
  if (Array.isArray(accounts) && accounts.length) {
    await prisma.account.createMany({
      data: accounts.map(a => ({
        householdId: hh.id,
        name: a.name,
        kind: a.kind || "other",
        balance: a.balance ?? null,
        goal: a.goal ?? null,
      }))
    });
  }
  return true;
}

/** Upsert finance settings JSON */
export async function saveFinance(userId, config, currency = "EUR") {
  const hh = await ensureUserHousehold(userId);
  await prisma.financeSettings.upsert({
    where: { householdId: hh.id },
    update: { config, currency },
    create: { householdId: hh.id, config, currency },
  });
  return true;
}

/** Replace all shopping items for the default list */
export async function saveShopping(userId, items) {
  const hh = await ensureUserHousehold(userId);
  const list = await prisma.shoppingList.findFirst({ where: { householdId: hh.id, name: "Groceries" } });
  if (!list) throw new Error("Default list missing");
  await prisma.shoppingItem.deleteMany({ where: { listId: list.id } });
  if (Array.isArray(items) && items.length) {
    // createMany can't set updatedAt; Prisma will set automatically
    await prisma.shoppingItem.createMany({
      data: items.map(it => ({
        listId: list.id,
        name: it.name,
        qty: it.qty || null,
        category: it.category || null,
        notes: it.notes || null,
        checked: !!it.checked,
        price: it.price ?? null,
        store: it.store || null,
      }))
    });
  }
  return true;
}
EOF

echo "==> API routes (Node runtime) – load/save per household"
mkdir -p pages/api/household-data

# GET bundle
cat > pages/api/household-data/get.js <<'EOF'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { loadHouseholdBundle } from "@/lib/household-data";

export default withSessionRoute(async (req, res) => {
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });
  const data = await loadHouseholdBundle(me.id);
  res.json({ ok:true, data });
});
EOF

# POST accounts
cat > pages/api/household-data/save-accounts.js <<'EOF'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { saveAccounts } from "@/lib/household-data";

export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });
  const { accounts } = req.body || {};
  await saveAccounts(me.id, Array.isArray(accounts) ? accounts : []);
  res.json({ ok:true });
});
EOF

# POST finance
cat > pages/api/household-data/save-finance.js <<'EOF'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { saveFinance } from "@/lib/household-data";

export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });
  const { config, currency } = req.body || {};
  await saveFinance(me.id, config ?? {}, currency || "EUR");
  res.json({ ok:true });
});
EOF

# POST shopping
cat > pages/api/household-data/save-shopping.js <<'EOF'
export const config = { runtime: "nodejs" };
import { withSessionRoute } from "@/lib/session";
import { saveShopping } from "@/lib/household-data";

export default withSessionRoute(async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const me = req.session.user;
  if (!me) return res.status(401).json({ ok:false });
  const { items } = req.body || {};
  await saveShopping(me.id, Array.isArray(items) ? items : []);
  res.json({ ok:true });
});
EOF

echo "==> Tiny client helper you can call from your pages"
cat > lib/householdClient.js <<'EOF'
async function jfetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers||{}) },
    credentials: "include",
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok || (data && data.ok === false)) {
    throw new Error((data && data.error) || `Request failed: ${res.status}`);
  }
  return data;
}

export async function getHouseholdData() {
  const { data } = await jfetch("/api/household-data/get");
  return data; // { household, accounts, finance, shopping }
}

export async function saveHouseholdAccounts(accounts) {
  return jfetch("/api/household-data/save-accounts", {
    method: "POST", body: JSON.stringify({ accounts })
  });
}

export async function saveHouseholdFinance(config, currency="EUR") {
  return jfetch("/api/household-data/save-finance", {
    method: "POST", body: JSON.stringify({ config, currency })
  });
}

export async function saveHouseholdShopping(items) {
  return jfetch("/api/household-data/save-shopping", {
    method: "POST", body: JSON.stringify({ items })
  });
}
EOF

echo "==> Updating package.json build script (ensure migrations apply on Vercel)"
node - <<'JS'
const fs=require('fs');
const p='package.json';
const pkg=JSON.parse(fs.readFileSync(p,'utf8'));
pkg.scripts=pkg.scripts||{};
pkg.scripts.build="prisma migrate deploy && next build";
if(!pkg.scripts.dev) pkg.scripts.dev="next dev";
if(!pkg.scripts.start) pkg.scripts.start="next start";
fs.writeFileSync(p, JSON.stringify(pkg,null,2));
console.log(" • package.json scripts updated");
JS

echo "==> Attempting Prisma generate + migration (needs PRISMA_DATABASE_URL & POSTGRES_URL)"
set +u
source ./.env >/dev/null 2>&1 || true
source ./.env.local >/dev/null 2>&1 || true
set -u

if [[ -n "${PRISMA_DATABASE_URL:-}" && -n "${POSTGRES_URL:-}" ]]; then
  npx prisma generate >/dev/null
  npx prisma migrate dev --name household_data
else
  echo "NOTE: DB URLs not loaded in shell; skipping migration."
  echo "      After adding PRISMA_DATABASE_URL and POSTGRES_URL to .env/.env.local, run:"
  echo "         npx prisma generate && npx prisma migrate dev --name household_data"
fi

echo ""
echo "✅ Household data layer ready (DB + APIs + client helper)."
echo "➡ Now wire your pages to these helper functions (see below)."
