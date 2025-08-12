import Link from "next/link";
import { useRouter } from "next/router";
import useMedia from "@/utils/useMedia";
import dynamic from "next/dynamic";

// Avoid SSR mismatch by loading MobileNav client-side only
const MobileNav = dynamic(() => import("./MobileNav"), { ssr: false });

export default function Layout({ children }) {
  const { pathname } = useRouter();
  const isActive = (p) => (pathname === p ? "active" : "");
  const isPhone = useMedia("(max-width: 640px)");

  return (
    <>
      {/* Desktop top nav */}
      {!isPhone && (
        <nav className="nav">
          <div className="nav-inner">
            <Link href="/" className="brand">MoneyCouple</Link>
            <Link href="/shopping" className={isActive("/shopping")}>Shopping</Link>
            <Link href="/finance"  className={isActive("/finance")}>Budget</Link>
            <Link href="/savings"  className={isActive("/savings")}>Projections</Link>
            <Link href="/settings" className={isActive("/settings")}>Settings</Link>
          </div>
        </nav>
      )}

      <main className="container">{children}</main>

      {/* Mobile bottom tabs */}
      {isPhone && <MobileNav />}
    </>
  );
}
