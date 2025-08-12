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
