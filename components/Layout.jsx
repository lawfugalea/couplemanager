import Link from "next/link";
import { useRouter } from "next/router";

export default function Layout({ children }) {
  const { pathname } = useRouter();
  const is = (p) => (pathname === p ? "active" : "");
  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="brand">MoneyCouple</Link>
          <Link href="/shopping" className={is("/shopping")}>Shopping</Link>
          <Link href="/finance" className={is("/finance")}>Budget</Link>
          <Link href="/savings" className={is("/savings")}>Projections</Link>
          <Link href="/settings" className={is("/settings")}>Settings</Link>
        </div>
      </nav>
      <main className="container">{children}</main>
    </>
  );
}
