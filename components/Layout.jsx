import Link from "next/link";
import { useRouter } from "next/router";

export default function Layout({ children }) {
  const r = useRouter();
  const hideNav = r.pathname === "/login" || r.pathname === "/signup";

  const NavLink = ({ href, children }) => (
    <Link
      href={href}
      className={
        "nav-link" + (r.pathname === href || r.pathname.startsWith(href + "/") ? " active" : "")
      }
    >
      {children}
    </Link>
  );

  async function onLogout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    r.push("/login");
  }

  return (
    <>
      {!hideNav && (
        <nav className="topnav">
          <div className="brand">
            <Link href="/">MoneyCouple</Link>
          </div>

          <div className="links">
            <NavLink href="/shopping">Shopping</NavLink>
            <NavLink href="/finance">Budget</NavLink>
            <NavLink href="/projections">Projections</NavLink>
            <NavLink href="/settings">Settings</NavLink>
            <NavLink href="/household">Household</NavLink>
          </div>

          <div className="right">
            <button className="btn" onClick={onLogout} aria-label="Logout">Logout</button>
          </div>
        </nav>
      )}

      <main className="page">{children}</main>
    </>
  );
}
