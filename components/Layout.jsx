import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

export default function Layout({ children }) {
  const { pathname } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const hideNav = pathname === "/login" || pathname === "/signup";

  const NavLink = ({ href, children, icon }) => (
    <Link
      href={href}
      className={`nav-link ${pathname === href || pathname.startsWith(href + "/") ? "active" : ""}`}
    >
      {icon && <span className="nav-icon">{icon}</span>}
      {children}
    </Link>
  );

  async function onLogout() {
    try { 
      await fetch("/api/auth/logout", { method: "POST" }); 
    } catch {}
    window.location.href = "/login";
  }

  if (hideNav) {
    return (
      <div className="app-container">
        <main className="main-content">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav className="nav-header">
        <div className="nav-container">
          <Link href="/" className="nav-brand">
            💰 MoneyCouple
          </Link>

          <div className="nav-links">
            <NavLink href="/shopping" icon="🛒">Shopping</NavLink>
            <NavLink href="/finance" icon="📊">Budget</NavLink>
            <NavLink href="/savings" icon="📈">Projections</NavLink>
            <NavLink href="/settings" icon="⚙️">Settings</NavLink>
            <NavLink href="/household" icon="🏠">Household</NavLink>
            
            <button 
              onClick={onLogout} 
              className="btn btn-secondary btn-sm"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content animate-fade-in">
        {children}
      </main>
    </div>
  );
}