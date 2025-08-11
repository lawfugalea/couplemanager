#!/usr/bin/env bash
set -euo pipefail

echo "==> Styling & presentation overhaul"

# 1) GLOBAL THEME (sleek, modern, dark-mode aware)
cat > styles/globals.css <<'EOF'
:root{
  --bg: #0e1117;
  --card: #151923;
  --surface: #0f141c;
  --text: #eef0f7;
  --muted: #a4acc4;
  --border: #222737;
  --accent: #7c8aff;      /* lavender/indigo */
  --accent-600: #6e7cff;
  --accent-700: #606eff;
  --success: #49d49d;
  --warn: #ffb86b;
  --danger: #ff6b6b;
  --shadow: 0 10px 30px rgba(0,0,0,.35);
  --radius: 14px;
}
@media (prefers-color-scheme: light){
  :root{
    --bg: #f6f7fb;
    --card: #ffffff;
    --surface: #f1f3f9;
    --text: #12131a;
    --muted: #6c7285;
    --border: #e6e8f0;
    --shadow: 0 8px 30px rgba(20,24,40,.08);
    --accent: #4f46e5;
    --accent-600: #4338ca;
    --accent-700: #3730a3;
  }
}

html, body{
  margin:0; padding:0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  background: radial-gradient(1200px 500px at 10% -10%, color-mix(in oklab, var(--accent) 12%, transparent), transparent) ,
              radial-gradient(1200px 600px at 100% -10%, color-mix(in oklab, var(--accent) 10%, transparent), transparent),
              var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
* { box-sizing: border-box; }

.container{ max-width: 1060px; margin: 0 auto; padding: 28px; }

.nav{
  position: sticky; top:0; z-index: 40;
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(8px);
  background: color-mix(in oklab, var(--bg) 88%, transparent);
}
.nav-inner{
  max-width: 1060px; margin:0 auto; padding: 12px 24px;
  display:flex; gap:10px; align-items:center;
}
.brand{
  margin-right: auto; font-weight: 900; letter-spacing:.2px; font-size: 18px;
  padding: 8px 12px; border-radius: 12px;
  background: color-mix(in oklab, var(--accent) 12%, transparent);
  border: 1px solid var(--border);
}
.nav a{
  text-decoration:none; color: var(--muted); font-weight: 700;
  padding: 8px 12px; border-radius: 10px; transition: 120ms;
}
.nav a:hover{ color: var(--text); background: color-mix(in oklab, var(--card) 75%, transparent); }
.nav a.active{ color: var(--text); background: var(--card); box-shadow: var(--shadow); }

h1{ font-size: 30px; margin: 8px 0 12px; letter-spacing:.2px;}
h2{ font-size: 22px; margin: 10px 0 10px; }
h3{ font-size: 18px; margin: 6px 0 6px; }

.hero{
  display:grid; grid-template-columns: 1.1fr .9fr; gap: 18px;
  background: linear-gradient(120deg, color-mix(in oklab, var(--accent) 20%, var(--card)), var(--card));
  border: 1px solid var(--border); border-radius: 20px; padding: 20px; box-shadow: var(--shadow);
}
.hero > div:last-child{
  border-radius: 16px; border: 1px dashed var(--border);
  background: color-mix(in oklab, var(--surface) 80%, transparent);
  min-height: 140px; display:flex; align-items:center; justify-content:center; color: var(--muted); font-weight:700;
}

.card{
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
  margin: 14px 0;
  box-shadow: var(--shadow);
}

.row{ display:grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 860px){ .row{ grid-template-columns: 1fr; } }

.input, .select, .readonly{
  width: 100%; padding: 12px 14px; font-size: 16px; border-radius: 12px;
  border: 1px solid var(--border); background: color-mix(in oklab, var(--card) 96%, var(--surface)); color: var(--text);
  outline: none; transition: 150ms;
}
.input:focus, .select:focus{
  border-color: var(--accent);
  box-shadow: 0 0 0 6px color-mix(in oklab, var(--accent) 20%, transparent);
}
.readonly{
  background: color-mix(in oklab, var(--surface) 75%, var(--card));
}

.button{
  padding: 11px 16px; border:none; cursor:pointer; border-radius: 12px; font-weight: 900;
  background: var(--accent); color: white; transition: transform 90ms ease, background 140ms ease;
}
.button:hover{ background: var(--accent-600); transform: translateY(-1px); }
.button:active{ background: var(--accent-700); transform: translateY(0); }
.button.secondary{
  background: color-mix(in oklab, var(--card) 70%, var(--surface));
  color: var(--text); border: 1px solid var(--border);
}
.button.ghost{
  background: transparent; border: 1px dashed var(--border); color: var(--muted);
}
.buttons{ display:flex; gap:10px; flex-wrap: wrap; }

.badge{
  display:inline-flex; align-items:center; gap:8px;
  padding: 6px 10px; border-radius: 999px; border: 1px solid var(--border);
  background: color-mix(in oklab, var(--accent) 14%, var(--card)); color: var(--text); font-weight:800;
}

.muted{ color: var(--muted); }
.space{ height: 10px; }
.small{ font-size: 13px; }
.monosm{ font-variant-numeric: tabular-nums; }

.toolbar{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; }

.avatar{
  width: 34px; height: 34px; border-radius: 999px; margin-right: 8px;
  display:inline-flex; align-items:center; justify-content:center; font-weight: 900;
  background: color-mix(in oklab, var(--accent) 15%, var(--card));
  color: var(--text); border: 1px solid var(--border);
}

.list{
  margin: 0; padding: 0; list-style: none;
}
.list-item{
  display:flex; align-items:center; justify-content:space-between;
  gap: 12px; padding: 12px 0; border-bottom: 1px dashed var(--border);
}
.checkbox-line{ display:flex; align-items:center; gap: 12px; }

.kpi{
  display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
}
.kpi > div{
  padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px;
  background: color-mix(in oklab, var(--surface) 75%, var(--card));
}
EOF

# 2) LAYOUT: active nav, sleeker brand, add Projections link if present
cat > components/Layout.jsx <<'EOF'
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
          <Link href="/grocery" className={is("/grocery")}>Grocery</Link>
          <Link href="/finance" className={is("/finance")}>Budget</Link>
          <Link href="/savings" className={is("/savings")}>Projections</Link>
          <Link href="/settings" className={is("/settings")}>Settings</Link>
        </div>
      </nav>
      <main className="container">{children}</main>
    </>
  );
}
EOF

# 3) HOME: hero section
cat > pages/index.js <<'EOF'
import Link from "next/link";

export default function Home() {
  return (
    <>
      <div className="hero">
        <div>
          <h1>Shared Groceries & Smarter Budgeting</h1>
          <p className="muted">
            Keep shopping simple and your savings intentional. Track your monthly expense pot,
            top-up the joint expenses account, and grow savings with a clear plan.
          </p>
          <div className="space" />
          <div className="buttons">
            <Link href="/grocery" className="button">Open Grocery List</Link>
            <Link href="/finance" className="button secondary">Budget Planner</Link>
            <Link href="/savings" className="button ghost">Savings Projection</Link>
          </div>
        </div>
        <div>
          <span className="small muted">Your family’s money, tidy and visible ✨</span>
        </div>
      </div>

      <div className="card">
        <h3>Quick Start</h3>
        <div className="kpi">
          <div><strong>1.</strong> Add grocery items</div>
          <div><strong>2.</strong> Set monthly budget & split</div>
          <div><strong>3.</strong> Project savings</div>
        </div>
      </div>
    </>
  );
}
EOF

# 4) GROCERY: toolbar, counters, hide-checked toggle
cat > pages/grocery.jsx <<'EOF'
import { useMemo, useState } from "react";
import useLocalStorage from "@/utils/useLocalStorage";

export default function Grocery() {
  const [items, setItems] = useLocalStorage("grocery-list", []);
  const [text, setText] = useState("");
  const [hideChecked, setHideChecked] = useState(false);

  const addItem = () => {
    const t = text.trim();
    if (!t) return;
    setItems(prev => [...prev, { text: t, bought: false, id: crypto.randomUUID() }]);
    setText("");
  };
  const toggle = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, bought: !i.bought } : i));
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));
  const clearBought = () => setItems(prev => prev.filter(i => !i.bought));

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter(i => i.bought).length;
    return { total, done, left: total - done };
  }, [items]);

  const visible = hideChecked ? items.filter(i => !i.bought) : items;

  return (
    <>
      <h1>Grocery List</h1>

      <div className="card">
        <div className="toolbar">
          <input className="input" placeholder="Add an item… (Enter to add)"
                 value={text} onChange={e => setText(e.target.value)}
                 onKeyDown={e => (e.key === 'Enter' ? addItem() : null)} />
          <button className="button" onClick={addItem}>Add</button>
          <button className="button secondary" onClick={clearBought}>Clear checked</button>
          <button className="button ghost" onClick={() => setHideChecked(v => !v)}>
            {hideChecked ? "Show checked" : "Hide checked"}
          </button>
          <span className="badge">Total: {stats.total}</span>
          <span className="badge">Left: {stats.left}</span>
          <span className="badge">Done: {stats.done}</span>
        </div>
      </div>

      <div className="card">
        {items.length === 0 && <p className="muted">No items yet. Add milk, eggs, nappies…</p>}
        <ul className="list">
          {visible.map(item => (
            <li key={item.id} className="list-item">
              <label className="checkbox-line">
                <input type="checkbox" checked={item.bought} onChange={() => toggle(item.id)} />
                <span style={{ textDecoration: item.bought ? 'line-through' : 'none' }}>{item.text}</span>
              </label>
              <button className="button secondary" onClick={() => removeItem(item.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
EOF

# 5) FINANCE: keep 3 buckets + save/load, improved layout/labels
cat > pages/finance.jsx <<'EOF'
import { useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import useLocalStorage from "@/utils/useLocalStorage";

export default function Finance() {
  const [profiles] = useState({
    ryan: { name: "Ryan Galea" },
    steff: { name: "Steff" }
  });

  const defaultForm = {
    ryanIncome: 0,
    steffIncome: 0,
    monthlyBudget: 0,     // Monthly Expense account
    expensesTopUp: 0,     // Expenses account (fixed top-up)
    savingsRate: 20,      // Savings (% of total income)
    splitMethod: "equal"  // 'equal' | 'proportional'
  };

  const [saved, setSaved] = useLocalStorage("finance-form", defaultForm);
  const [form, setForm] = useState(saved || defaultForm);
  const [savedMsg, setSavedMsg] = useState("");

  const onChange = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const { ryanIncome, steffIncome, monthlyBudget, expensesTopUp, savingsRate, splitMethod } = form;

  const calc = useMemo(() => {
    const r = Number(ryanIncome) || 0;
    const s = Number(steffIncome) || 0;
    const totalIncome = r + s;

    const targetMonthly  = Math.max(0, Number(monthlyBudget) || 0);
    const targetExpenses = Math.max(0, Number(expensesTopUp) || 0);
    const targetSavings  = Math.max(0, Number(savingsRate) || 0) / 100 * totalIncome;

    const split = (amount) => {
      if (amount <= 0) return { ryan: 0, steff: 0 };
      if (splitMethod === "proportional" && totalIncome > 0) {
        const rs = r / totalIncome, ss = s / totalIncome;
        return { ryan: amount * rs, steff: amount * ss };
      }
      return { ryan: amount / 2, steff: amount / 2 };
    };

    const monthly  = split(targetMonthly);
    const expenses = split(targetExpenses);
    const savings  = split(targetSavings);

    const remRyan  = r - (monthly.ryan + expenses.ryan + savings.ryan);
    const remSteff = s - (monthly.steff + expenses.steff + savings.steff);

    return {
      totalIncome, targetMonthly, targetExpenses, targetSavings,
      monthly, expenses, savings, remRyan, remSteff
    };
  }, [ryanIncome, steffIncome, monthlyBudget, expensesTopUp, savingsRate, splitMethod]);

  const fmt = (x) => (Number.isFinite(x) ? x.toFixed(2) : "0.00");
  const save = () => { setSaved(form); setSavedMsg("Saved ✔"); setTimeout(()=>setSavedMsg(""), 1200); };
  const load = () => { setForm(saved || defaultForm); setSavedMsg("Loaded"); setTimeout(()=>setSavedMsg(""), 1200); };

  return (
    <>
      <h1>Budget & Savings Planner</h1>

      <div className="card">
        <div className="row">
          <div>
            <label><Avatar name={profiles.ryan.name} /> {profiles.ryan.name} income</label>
            <div className="space" />
            <input className="input" type="number" value={ryanIncome}
                   onChange={e => onChange("ryanIncome", Number(e.target.value))} />
          </div>
          <div>
            <label><Avatar name={profiles.steff.name} /> {profiles.steff.name} income</label>
            <div className="space" />
            <input className="input" type="number" value={steffIncome}
                   onChange={e => onChange("steffIncome", Number(e.target.value))} />
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <div>
            <label>Monthly expense budget → <span className="badge">Monthly Expense</span></label>
            <div className="space" />
            <input className="input" type="number" value={monthlyBudget}
                   onChange={e => onChange("monthlyBudget", Number(e.target.value))} />
          </div>
          <div>
            <label>Fixed top-up → <span className="badge">Expenses</span></label>
            <div className="space" />
            <input className="input" type="number" value={expensesTopUp}
                   onChange={e => onChange("expensesTopUp", Number(e.target.value))} />
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <div>
            <label>Savings % of total income → <span className="badge">Savings</span></label>
            <div className="space" />
            <input className="input" type="number" value={savingsRate}
                   onChange={e => onChange("savingsRate", Number(e.target.value))} />
          </div>
          <div>
            <label>Split method</label>
            <div className="space" />
            <select className="select" value={splitMethod}
                    onChange={e => onChange("splitMethod", e.target.value)}>
              <option value="equal">Equal 50/50</option>
              <option value="proportional">Proportional to income</option>
            </select>
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <div>
            <label>Total combined income</label>
            <div className="space" />
            <div className="readonly monosm">€ {fmt(calc.totalIncome)}</div>
          </div>
          <div className="buttons" style={{alignItems:'end'}}>
            <button className="button" onClick={save}>Save</button>
            <button className="button secondary" onClick={load}>Load saved</button>
            {savedMsg && <span className="muted" style={{alignSelf:'center'}}>{savedMsg}</span>}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Recommended Contributions</h3>
        <p className="muted small">Monthly Expense + Expenses (buffer) + Savings are separated. Remainder stays personal.</p>

        <div className="row" style={{marginTop:12}}>
          <div>
            <strong>Monthly Expense account</strong>
            <div className="space" />
            <p><Avatar name={profiles.ryan.name} /> {profiles.ryan.name}: € {fmt(calc.monthly.ryan)}</p>
            <p><Avatar name={profiles.steff.name} /> {profiles.steff.name}: € {fmt(calc.monthly.steff)}</p>
            <p className="muted small">Target (total): € {fmt(calc.targetMonthly)}</p>
          </div>

          <div>
            <strong>Expenses account</strong>
            <div className="space" />
            <p><Avatar name={profiles.ryan.name} /> {profiles.ryan.name}: € {fmt(calc.expenses.ryan)}</p>
            <p><Avatar name={profiles.steff.name} /> {profiles.steff.name}: € {fmt(calc.expenses.steff)}</p>
            <p className="muted small">Target (total): € {fmt(calc.targetExpenses)}</p>
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <div>
            <strong>Savings</strong>
            <div className="space" />
            <p><Avatar name={profiles.ryan.name} /> {profiles.ryan.name}: € {fmt(calc.savings.ryan)}</p>
            <p><Avatar name={profiles.steff.name} /> {profiles.steff.name}: € {fmt(calc.savings.steff)}</p>
            <p className="muted small">Target (total): € {fmt(calc.targetSavings)}</p>
          </div>

          <div>
            <strong>What’s left for personal accounts</strong>
            <div className="space" />
            <p><Avatar name={profiles.ryan.name} /> {profiles.ryan.name}: <strong>€ {fmt(calc.remRyan)}</strong></p>
            <p><Avatar name={profiles.steff.name} /> {profiles.steff.name}: <strong>€ {fmt(calc.remSteff)}</strong></p>
          </div>
        </div>
      </div>
    </>
  );
}
EOF

# 6) SAVINGS: tidy spacing & cards (keeps your logic)
if [ -f pages/savings.jsx ]; then
  sed -i 's/<h1>Savings Projection<\/h1>/<h1>Savings Projection<\/h1>/' pages/savings.jsx || true
fi

echo "==> Done. Restart dev (npm run dev) and refresh."
