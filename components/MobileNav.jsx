import Link from "next/link";
import { useRouter } from "next/router";

function IconCart(props){return(
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
    <path d="M3 3h1.5l2.1 12.6a1 1 0 0 0 .99.84h9.9a1 1 0 0 0 .98-.8l1.62-8.1H6.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="20" r="1.6" fill="currentColor"/><circle cx="17" cy="20" r="1.6" fill="currentColor"/>
  </svg>
)}
function IconBudget(props){return(
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
    <path d="M4 19V5m5 14V9m5 10v-7m5 7V6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)}
function IconProj(props){return(
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
    <path d="M3 17s3-6 7-6 4 3 7 3 4-2 4-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="3" cy="17" r="1.5" fill="currentColor"/><circle cx="10" cy="11" r="1.5" fill="currentColor"/><circle cx="17" cy="14" r="1.5" fill="currentColor"/><circle cx="22" cy="12" r="1.5" fill="currentColor"/>
  </svg>
)}
function IconSettings(props){return(
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...props}>
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8.5-3.5a6.6 6.6 0 0 0-.08-.99l2.04-1.58-2-3.46-2.4.83a6.7 6.7 0 0 0-1.72-1L15.9 2h-3.8l-.62 2.82a6.7 6.7 0 0 0-1.72 1l-2.4-.83-2 3.46 2.04 1.58c-.05.33-.08.66-.08.99s.03.66.08.99L3.64 14.6l2 3.46 2.4-.83c.53.42 1.11.76 1.72 1L12.1 21h3.8l.62-2.82c.61-.24 1.19-.58 1.72-1l2.4.83 2-3.46-2.04-1.58c.05-.33.08-.66.08-.99Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)}

const tabs = [
  { href: "/shopping", label: "Shop", Icon: IconCart },
  { href: "/finance",  label: "Budget", Icon: IconBudget },
  { href: "/savings",  label: "Proj",   Icon: IconProj },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

export default function MobileNav() {
  const { pathname } = useRouter();
  return (
    <nav className="mobile-tabbar" role="navigation" aria-label="Bottom navigation">
      {tabs.map(({href,label,Icon}) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className={active ? "tab active" : "tab"} aria-current={active ? "page" : undefined}>
            <Icon className="ico" />
            <span className="lbl">{label}</span>
            {active && <span className="dot" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}
