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