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
