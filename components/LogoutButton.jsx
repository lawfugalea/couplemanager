import { useRouter } from "next/router";
import { useCallback } from "react";

export default function LogoutButton() {
  const r = useRouter();
  // Hide on auth pages
  if (r.pathname === "/login" || r.pathname === "/signup") return null;

  const onLogout = useCallback(async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    window.location.href = "/login";
  }, []);

  return (
    <button
      onClick={onLogout}
      aria-label="Logout"
      title="Logout"
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 1000,
        padding: "8px 12px",
        borderRadius: 12,
        border: "1px solid var(--border, #e5e7eb)",
        background: "var(--card, #fff)",
        boxShadow: "0 6px 16px rgba(0,0,0,.08)",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Logout
    </button>
  );
}
