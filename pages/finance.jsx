import { requireAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import useLocalStorage from "@/utils/useLocalStorage";
import { Doughnut } from "@/components/Charts";

export default function Finance() {
  const [profiles] = useState({
    ryan: { name: "Ryan Galea" },
    steff: { name: "Steff" }
  });

  const defaultForm = {
    ryanIncome: 0,
    steffIncome: 0,
    monthlyBudget: 0,
    expensesTopUp: 0,
    savingsRate: 20,
    splitMethod: "equal"
  };

  const [saved, setSaved] = useLocalStorage("finance-form", defaultForm);
  const [form, setForm] = useState(saved || defaultForm);
  const [savedMsg, setSavedMsg] = useState("");
  const [focus, setFocus] = useState("totals");

  const onChange = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const { ryanIncome, steffIncome, monthlyBudget, expensesTopUp, savingsRate, splitMethod } = form;

  const fmt = (x) => (Number.isFinite(x) ? x.toFixed(2) : "0.00");

  const calc = useMemo(() => {
    const r = Number(ryanIncome) || 0;
    const s = Number(steffIncome) || 0;
    const totalIncome = r + s;

    const TM = Math.max(0, Number(monthlyBudget) || 0);
    const TE = Math.max(0, Number(expensesTopUp) || 0);
    const TS = Math.max(0, Number(savingsRate) || 0) / 100 * totalIncome;
    const T = TM + TE + TS;

    let mR=0,mS=0, eR=0,eS=0, sR=0,sS=0, warn=null;

    if (splitMethod === "proportional" && totalIncome > 0) {
      const pr = r / totalIncome, ps = s / totalIncome;
      mR = TM*pr; mS = TM*ps;
      eR = TE*pr; eS = TE*ps;
      sR = TS*pr; sS = TS*ps;
    } else if (splitMethod === "equal-leftover") {
      const L = (r + s - T) / 2;
      if (L < 0) warn = "Targets exceed combined income — leftovers go negative.";

      let Cr = r - L;
      let Cs = s - L;

      if (T > 0) {
        Cr = Math.max(0, Math.min(T, Cr));
        Cs = T - Cr;
      } else {
        Cr = 0; Cs = 0;
      }

      const f = T > 0 ? (Cr / T) : 0;
      const g = 1 - f;

      mR = TM*f; mS = TM*g;
      eR = TE*f; eS = TE*g;
      sR = TS*f; sS = TS*g;
    } else {
      mR = TM/2; mS = TM/2;
      eR = TE/2; eS = TE/2;
      sR = TS/2; sS = TS/2;
    }

    const remR = (r - (mR + eR + sR));
    const remS = (s - (mS + eS + sS));

    return {
      totalIncome, TM, TE, TS, T,
      monthly: { ryan: mR, steff: mS },
      expenses: { ryan: eR, steff: eS },
      savings: { ryan: sR, steff: sS },
      remR, remS, warn
    };
  }, [ryanIncome, steffIncome, monthlyBudget, expensesTopUp, savingsRate, splitMethod]);

  const save = () => { 
    setSaved(form); 
    setSavedMsg("Saved ✔"); 
    setTimeout(() => setSavedMsg(""), 1200); 
  };
  
  const load = () => { 
    setForm(saved || defaultForm); 
    setSavedMsg("Loaded"); 
    setTimeout(() => setSavedMsg(""), 1200); 
  };

  // Chart data
  const css = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const colMonthly = css ? css.getPropertyValue("--primary-500").trim() : "#0ea5e9";
  const colExpenses = css ? css.getPropertyValue("--secondary-500").trim() : "#d946ef";
  const colSavings = css ? css.getPropertyValue("--success-500").trim() : "#22c55e";

  const doughnut = useMemo(() => {
    if (focus === "totals") {
      return {
        labels: ["Monthly", "Expenses", "Savings"],
        data: [calc.TM, calc.TE, calc.TS],
        colors: [colMonthly, colExpenses, colSavings]
      };
    }
    if (focus === "monthly") {
      return {
        labels: ["Ryan", "Steff"],
        data: [calc.monthly.ryan, calc.monthly.steff],
        colors: [colMonthly, `${colMonthly}90`]
      };
    }
    if (focus === "expenses") {
      return {
        labels: ["Ryan", "Steff"],
        data: [calc.expenses.ryan, calc.expenses.steff],
        colors: [colExpenses, `${colExpenses}90`]
      };
    }
    return {
      labels: ["Ryan", "Steff"],
      data: [calc.savings.ryan, calc.savings.steff],
      colors: [colSavings, `${colSavings}90`]
    };
  }, [focus, calc, colMonthly, colExpenses, colSavings]);

  const doughnutData = {
    labels: doughnut.labels,
    datasets: [{ data: doughnut.data, backgroundColor: doughnut.colors, borderWidth: 0 }]
  };

  const doughnutOpts = {
    plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
    cutout: "60%",
    responsive: true,
    maintainAspectRatio: false
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">📊 Budget & Savings Planner</h1>
          <p className="text-secondary mt-2">Plan your finances and split expenses fairly</p>
        </div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', minWidth: '200px' }}>
          <div className="stat-card">
            <div className="stat-value text-lg">€{fmt(calc.totalIncome)}</div>
            <div className="stat-label">Total Income</div>
          </div>
          <div className="stat-card">
            <div className="stat-value text-lg">€{fmt(calc.T)}</div>
            <div className="stat-label">Total Allocated</div>
          </div>
        </div>
      </div>

      {/* Income Input */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">💰 Monthly Income</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Avatar name={profiles.ryan.name} />
              {profiles.ryan.name} Income
            </label>
            <input 
              className="form-input" 
              type="number" 
              value={form.ryanIncome}
              onChange={e => onChange("ryanIncome", Number(e.target.value))} 
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label className="form-label flex items-center gap-2">
              <Avatar name={profiles.steff.name} />
              {profiles.steff.name} Income
            </label>
            <input 
              className="form-input" 
              type="number" 
              value={form.steffIncome}
              onChange={e => onChange("steffIncome", Number(e.target.value))} 
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Budget Allocation */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">🎯 Budget Allocation</h3>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="form-group">
            <label className="form-label">
              Monthly Expense Budget
              <span className="badge badge-primary ml-2">Monthly</span>
            </label>
            <input 
              className="form-input" 
              type="number" 
              value={form.monthlyBudget}
              onChange={e => onChange("monthlyBudget", Number(e.target.value))} 
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Fixed Expenses Top-up
              <span className="badge badge-warning ml-2">Expenses</span>
            </label>
            <input 
              className="form-input" 
              type="number" 
              value={form.expensesTopUp}
              onChange={e => onChange("expensesTopUp", Number(e.target.value))} 
              placeholder="0.00"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="form-group">
            <label className="form-label">
              Savings Rate (% of total income)
              <span className="badge badge-success ml-2">Savings</span>
            </label>
            <input 
              className="form-input" 
              type="number" 
              value={form.savingsRate}
              onChange={e => onChange("savingsRate", Number(e.target.value))} 
              placeholder="20"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Split Method</label>
            <select 
              className="form-select" 
              value={form.splitMethod}
              onChange={e => onChange("splitMethod", e.target.value)}
            >
              <option value="equal">Equal 50/50</option>
              <option value="proportional">Proportional to income</option>
              <option value="equal-leftover">Equal leftover</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button className="btn btn-primary" onClick={save}>
            💾 Save Configuration
          </button>
          <button className="btn btn-secondary" onClick={load}>
            📂 Load Saved
          </button>
          {savedMsg && (
            <div className="alert alert-success" style={{ padding: 'var(--space-2) var(--space-4)', margin: 0 }}>
              {savedMsg}
            </div>
          )}
          {calc.warn && (
            <div className="alert alert-warning" style={{ padding: 'var(--space-2) var(--space-4)', margin: 0 }}>
              ⚠️ {calc.warn}
            </div>
          )}
        </div>
      </div>

      {/* Allocation Overview */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">📈 Allocation Overview</h3>
          <div className="flex gap-2">
            <button 
              className={`btn btn-sm ${focus === 'totals' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFocus('totals')}
            >
              Totals
            </button>
            <button 
              className={`btn btn-sm ${focus === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFocus('monthly')}
            >
              Monthly
            </button>
            <button 
              className={`btn btn-sm ${focus === 'expenses' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFocus('expenses')}
            >
              Expenses
            </button>
            <button 
              className={`btn btn-sm ${focus === 'savings' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFocus('savings')}
            >
              Savings
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6 items-center">
          <div className="space-y-4">
            <div className="finance-card">
              <div className="text-sm text-secondary mb-1">Monthly Total</div>
              <div className="text-2xl font-bold">€{fmt(calc.TM)}</div>
            </div>
            <div className="finance-card">
              <div className="text-sm text-secondary mb-1">Expenses Total</div>
              <div className="text-2xl font-bold">€{fmt(calc.TE)}</div>
            </div>
            <div className="finance-card">
              <div className="text-sm text-secondary mb-1">Savings Total</div>
              <div className="text-2xl font-bold">€{fmt(calc.TS)}</div>
            </div>
          </div>
          <div className="chart-container">
            <Doughnut data={doughnutData} options={doughnutOpts} />
          </div>
        </div>
      </div>

      {/* Recommended Contributions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">💡 Recommended Contributions</h3>
          <p className="card-subtitle">Individual contributions based on your split method</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="finance-card">
            <h4 className="font-semibold mb-4" style={{ color: 'var(--primary-600)' }}>
              📅 Monthly Expense Account
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={profiles.ryan.name} />
                  <span>{profiles.ryan.name}</span>
                </div>
                <span className="font-bold">€{fmt(calc.monthly.ryan)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={profiles.steff.name} />
                  <span>{profiles.steff.name}</span>
                </div>
                <span className="font-bold">€{fmt(calc.monthly.steff)}</span>
              </div>
              <div className="text-sm text-secondary pt-2 border-t">
                Target Total: €{fmt(calc.TM)}
              </div>
            </div>
          </div>

          <div className="finance-card">
            <h4 className="font-semibold mb-4" style={{ color: 'var(--secondary-600)' }}>
              🏠 Expenses Account
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={profiles.ryan.name} />
                  <span>{profiles.ryan.name}</span>
                </div>
                <span className="font-bold">€{fmt(calc.expenses.ryan)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={profiles.steff.name} />
                  <span>{profiles.steff.name}</span>
                </div>
                <span className="font-bold">€{fmt(calc.expenses.steff)}</span>
              </div>
              <div className="text-sm text-secondary pt-2 border-t">
                Target Total: €{fmt(calc.TE)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="finance-card">
            <h4 className="font-semibold mb-4" style={{ color: 'var(--success-600)' }}>
              💰 Savings
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={profiles.ryan.name} />
                  <span>{profiles.ryan.name}</span>
                </div>
                <span className="font-bold">€{fmt(calc.savings.ryan)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={profiles.steff.name} />
                  <span>{profiles.steff.name}</span>
                </div>
                <span className="font-bold">€{fmt(calc.savings.steff)}</span>
              </div>
              <div className="text-sm text-secondary pt-2 border-t">
                Target Total: €{fmt(calc.TS)}
              </div>
            </div>
          </div>

          <div className="finance-card">
            <h4 className="font-semibold mb-4">🎯 Personal Remainder</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={profiles.ryan.name} />
                  <span>{profiles.ryan.name}</span>
                </div>
                <span className="font-bold text-2xl">€{fmt(calc.remR)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={profiles.steff.name} />
                  <span>{profiles.steff.name}</span>
                </div>
                <span className="font-bold text-2xl">€{fmt(calc.remS)}</span>
              </div>
              <div className="text-sm text-secondary pt-2 border-t">
                Money left for personal spending
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = requireAuth();