#!/usr/bin/env bash
set -euo pipefail

echo "==> Adding 'Household' link to top navigation"

LAYOUT="components/Layout.jsx"
APPFILE="pages/_app.js"

mkdir -p components pages

# If Layout doesn't exist, create a minimal one with a nav that includes Household
if [ ! -f "$LAYOUT" ]; then
  cat > "$LAYOUT" <<'EOF'
import Link from "next/link";

export default function Layout({ children }) {
  return (
    <>
      <nav style={{
        display:"flex", gap:12, alignItems:"center",
        padding:"10px 14px", borderBottom:"1px solid var(--border,#e5e7eb)",
        position:"sticky", top:0, background:"var(--bg,#fff)", zIndex: 500
      }}>
        <Link href="/" className="button secondary">Home</Link>
        <Link href="/shopping" className="button secondary">Shopping</Link>
        <Link href="/finance" className="button secondary">Finance</Link>
        <Link href="/savings" className="button secondary">Savings</Link>
        <Link href="/settings" className="button secondary">Settings</Link>
        <Link href="/household" className="button">Household</Link>
      </nav>
      <main style={{padding:"12px"}}>{children}</main>
    </>
  );
}
EOF
  echo "• Created $LAYOUT"
else
  echo "• Patching existing $LAYOUT"
  cp "$LAYOUT" "$LAYOUT.bak"

  node - <<'PATCH'
const fs = require('fs');
const path = "components/Layout.jsx";
let s = fs.readFileSync(path, 'utf8');

// If already has a Household link, do nothing
if (s.includes('href="/household"')) {
  console.log("  - Household link already present. Skipping.");
  process.exit(0);
}

// Ensure Link import exists
if (!/from\s+["']next\/link["']/.test(s)) {
  const lines = s.split(/\r?\n/);
  let lastImport = -1;
  for (let i=0;i<lines.length;i++) if (/^\s*import\b/.test(lines[i])) lastImport = i;
  if (lastImport >= 0) {
    lines.splice(lastImport+1, 0, 'import Link from "next/link";');
    s = lines.join('\n');
  } else {
    s = 'import Link from "next/link";\n' + s;
  }
}

// Injection snippet
const linkHtml = `\n        <Link href="/household" className="button">Household</Link>`;

// Try to inject inside <nav>…</nav>
let before = s;
s = s.replace(/(<nav[^>]*>)/, `$1${linkHtml}`);
if (s !== before) {
  fs.writeFileSync(path, s);
  console.log("  - Inserted Household link inside <nav>.");
  process.exit(0);
}

// Try to inject inside <header>…</header>
before = s;
s = s.replace(/(<header[^>]*>)/, `$1${linkHtml}`);
if (s !== before) {
  fs.writeFileSync(path, s);
  console.log("  - Inserted Household link inside <header>.");
  process.exit(0);
}

// Fallback: add a simple top bar before main content
before = s;
s = s.replace(/return\s*\(\s*<>/, match => `${match}
      <div style={{
        display:"flex",gap:8,alignItems:"center",
        padding:"8px 12px",borderBottom:"1px solid var(--border,#e5e7eb)",
        position:"sticky",top:0,background:"var(--bg,#fff)",zIndex:500
      }}>
        <Link href="/household" className="button">Household</Link>
      </div>`);
if (s === before) {
  // If no fragment, try to inject right after the first opening tag in return
  s = s.replace(/return\s*\(\s*/, match => `${match}
    <>
      <div style={{
        display:"flex",gap:8,alignItems:"center",
        padding:"8px 12px",borderBottom:"1px solid var(--border,#e5e7eb)",
        position:"sticky",top:0,background:"var(--bg,#fff)",zIndex:500
      }}>
        <Link href="/household" className="button">Household</Link>
      </div>
  `);
  // ensure a closing fragment at the end
  if (!s.includes('</>')) {
    s = s.replace(/\)\s*;\s*}\s*$/, `    </>\n  );\n}\n`);
  }
}

fs.writeFileSync(path, s);
console.log("  - Added a top bar with Household link (fallback).");
PATCH
  echo "• Backup saved at $LAYOUT.bak"
fi

# Ensure _app wraps with Layout
if [ ! -f "$APPFILE" ]; then
  cat > "$APPFILE" <<'EOF'
import "@/styles/globals.css";
import Layout from "@/components/Layout";
import LogoutButton from "@/components/LogoutButton";

export default function App({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
      <LogoutButton />
    </Layout>
  );
}
EOF
  echo "• Created $APPFILE with Layout wrapper"
else
  # Patch existing _app.js to include Layout if missing
  node - <<'PATCH'
const fs=require('fs');
const path="pages/_app.js";
let s=fs.readFileSync(path,'utf8');
if(!/from\s+["']@\/components\/Layout["']/.test(s)){
  // add import
  const lines=s.split(/\r?\n/);
  let lastImport=-1;
  for(let i=0;i<lines.length;i++) if(/^\s*import\b/.test(lines[i])) lastImport=i;
  if(lastImport>=0){ lines.splice(lastImport+1,0,'import Layout from "@/components/Layout";'); s=lines.join('\n'); }
  else { s='import Layout from "@/components/Layout";\n'+s; }
}
if(!/<Layout>/.test(s)){
  // wrap <Component ... />
  s=s.replace(/return\s*\(\s*<>/m, 'return (');
  s=s.replace(/<Component([\s\S]*?)\/>/m, '<Layout>\n      <Component$1/>\n    </Layout>');
}
fs.writeFileSync(path,s);
console.log("• Ensured pages/_app.js wraps with <Layout>");
PATCH
fi

echo "==> Done. Restart the dev server: npm run dev"
echo "   You should now see a 'Household' button/link in the top navigation."
