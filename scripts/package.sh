#!/usr/bin/env bash
set -euo pipefail

echo "==> Fixing Prisma schema (add Household + related models)"

# 0) Make sure we have a schema dir
mkdir -p prisma

# 1) Backup existing schema (if any)
if [ -f prisma/schema.prisma ]; then
  cp prisma/schema.prisma prisma/schema.prisma.bak
  echo " • Backed up prisma/schema.prisma -> prisma/schema.prisma.bak"
fi

# 2) Write a COMPLETE schema that includes all referenced models
cat > prisma/schema.prisma <<'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  // Runtime URL (pooled/Accelerate)
  url       = env("PRISMA_DATABASE_URL")
  // Direct URL for migrations
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
  accounts   Account[]
  finance    FinanceSettings?
  lists      ShoppingList[]
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

model Account {
  id          String    @id @default(cuid())
  householdId String
  name        String
  kind        String    // "monthly" | "expenses" | "savings" | other
  balance     Decimal?  @db.Decimal(12,2)
  goal        Decimal?  @db.Decimal(12,2)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  household   Household @relation(fields: [householdId], references: [id])

  @@index([householdId])
}

model FinanceSettings {
  id          String    @id @default(cuid())
  householdId String    @unique
  currency    String    @default("EUR")
  config      Json?
  updatedAt   DateTime  @updatedAt
  household   Household @relation(fields: [householdId], references: [id])
}

model ShoppingList {
  id          String        @id @default(cuid())
  householdId String
  name        String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  items       ShoppingItem[]
  household   Household     @relation(fields: [householdId], references: [id])

  @@unique([householdId, name])
}

model ShoppingItem {
  id          String        @id @default(cuid())
  listId      String
  name        String
  qty         String?
  category    String?
  notes       String?
  checked     Boolean       @default(false)
  price       Decimal?      @db.Decimal(12,2)
  store       String?
  updatedAt   DateTime      @updatedAt
  list        ShoppingList  @relation(fields: [listId], references: [id])

  @@index([listId])
}
EOF
echo " • Wrote prisma/schema.prisma"

# 3) Ensure Prisma CLI can see env vars (CLI reads .env, not .env.local)
if [ ! -f .env ] && [ -f .env.local ]; then
  cp .env.local .env
  echo " • Created .env from .env.local for Prisma CLI"
fi

# 4) Sanity check the required envs
set +u
source ./.env >/dev/null 2>&1 || true
set -u

missing=0
for var in PRISMA_DATABASE_URL POSTGRES_URL ; do
  if [ -z "${!var:-}" ]; then
    echo " !! Missing $var in your environment (.env)."
    missing=1
  fi
done

if [ "$missing" -eq 1 ]; then
  echo ""
  echo "Please edit .env (and .env.local) to include:"
  echo "  PRISMA_DATABASE_URL=<(pooled/Accelerate URL from Vercel Storage)>"
  echo "  POSTGRES_URL=<(direct Postgres URL from Vercel Storage)>"
  echo "Then re-run:"
  echo "  npx prisma generate"
  echo "  npx prisma migrate dev --name households_and_invites"
  exit 1
fi

# 5) Format, generate client, run migration
npx prisma format
npx prisma generate
npx prisma migrate dev --name households_and_invites

echo ""
echo "✅ Prisma schema fixed and migration applied."
echo "If Vercel needs it too, push your repo; build script should run 'prisma migrate deploy && next build'."
