export async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body ?? {})
  });
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();
  let data = null;
  if (ct.includes("application/json") && text) {
    try { data = JSON.parse(text); } catch {}
  }
  if (!res.ok || (data && data.ok === false)) {
    const msg = (data && data.error) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}

export async function getJSON(url) {
  const res = await fetch(url, { credentials: "include" });
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();
  let data = null;
  if (ct.includes("application/json") && text) {
    try { data = JSON.parse(text); } catch {}
  }
  if (!res.ok || (data && data.ok === false)) {
    const msg = (data && data.error) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}
