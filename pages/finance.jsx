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
    monthlyBudget: 0,     // Monthly Expense account (target total)
    expensesTopUp: 0,     // Expenses account (fixed top-up, target total)
    savingsRate: 20,      // Savings target = % of total income
    splitMethod: "equal"  // 'equal' | 'proportional' | 'equal-leftover'
  };

  const [saved, setSaved] = useLocalStorage("finance-form", defaultForm);
  const [form, setForm]   = useState(saved || defaultForm);
  const [savedMsg, setSavedMsg] = useState("");

  const onChange = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const { ryanIncome, steffIncome, monthlyBudget, expensesTopUp, savingsRate, splitMethod } = form;

  const fmt = (x) => (Number.isFinite(x) ? x.toFixed(2) : "0.00");

  // ---- Core calculation with 3 split modes ----
  const calc = useMemo(() => {
    const r = Number(ryanIncome)  || 0;
    const s = Number(steffIncome) || 0;
    const totalIncome = r + s;

    const TM = Math.max(0, Number(monthlyBudget)  || 0);         // Monthly
    const TE = Math.max(0, Number(expensesTopUp)  || 0);         // Expenses
    const TS = Math.max(0, Number(savingsRate)    || 0) / 100 * totalIncome; // Savings (% of income)
    const T  = TM + TE + TS;                                     // Total contributions needed

    let mR=0,mS=0, eR=0,eS=0, sR=0,sS=0, warn=null;

    if (splitMethod === "proportional" && totalIncome > 0) {
      const pr = r / totalIncome, ps = s / totalIncome;
      mR = TM*pr; mS = TM*ps;
      eR = TE*pr; eS = TE*ps;
      sR = TS*pr; sS = TS*ps;
    } else if (splitMethod === "equal-leftover") {
      // Equalize leftover: remR = remS = L
      // L = (r + s - T) / 2  => contributions: C_r = r - L, C_s = s - L, with C_r + C_s = T
      const L = (r + s - T) / 2;
      if (L < 0) warn = "Targets exceed combined income — leftovers go negative.";

      let Cr = r - L;
      let Cs = s - L;

      // Enforce non-negativity and total T
      if (T > 0) {
        Cr = Math.max(0, Math.min(T, Cr));
        Cs = T - Cr;
      } else {
        Cr = 0; Cs = 0;
      }

      const f = T > 0 ? (Cr / T) : 0;       // Ryan pays f of each pot target
      const g = 1 - f;                      // Steff pays the rest

      mR = TM*f; mS = TM*g;
      eR = TE*f; eS = TE*g;
      sR = TS*f; sS = TS*g;
    } else {
      // default "equal" (50/50)
      mR = TM/2; mS = TM/2;
      eR = TE/2; eS = TE/2;
      sR = TS/2; sS = TS/2;
    }

    const remR = (r - (mR + eR + sR));
    const remS = (s - (mS + eS + sS));

    return {
      totalIncome, TM, TE, TS, T,
      monthly:  { ryan: mR, steff: mS },
      expenses: { ryan: eR, steff: eS },
      savings:  { ryan: sR, steff: sS },
      remR, remS, warn
    };
  }, [ryanIncome, steffIncome, monthlyBudget, expensesTopUp, savingsRate, splitMethod]);

  const save = () => { setSaved(form); setSavedMsg("Saved ✔"); setTimeout(()=>setSavedMsg(""), 1200); };
  const load = () => { setForm(saved || defaultForm); setSavedMsg("Loaded"); setTimeout(()=>setSavedMsg(""), 1200); };

  // ---- Doughnut + drill-down state ----
  // focus = "totals" | "monthly" | "expenses" | "savings"
  const [focus, setFocus] = useState("totals");

  // Dataset builder (reads CSS vars for colors)
  const css = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const colMonthly  = css ? css.getPropertyValue("--monthly").trim()  : "#3b82f6";
  const colExpenses = css ? css.getPropertyValue("--expenses").trim() : "#8b5cf6";
  const colSavings  = css ? css.getPropertyValue("--savings").trim()  : "#10b981";

  const doughnut = useMemo(() => {
    const sum = (o) => (o.ryan + o.steff);
    if (focus === "totals") {
      return {
        labels: ["Monthly", "Expenses", "Savings"],
        data:   [calc.TM, calc.TE, calc.TS],
        colors: [colMonthly, colExpenses, colSavings]
      };
    }
    if (focus === "monthly") {
      return {
        labels: ["Ryan", "Steff"],
        data:   [calc.monthly.ryan, calc.monthly.steff],
        colors: [colMonthly, `${colMonthly}90`]
      };
    }
    if (focus === "expenses") {
      return {
        labels: ["Ryan", "Steff"],
        data:   [calc.expenses.ryan, calc.expenses.steff],
        colors: [colExpenses, `${colExpenses}90`]
      };
    }
    // savings
    return {
      labels: ["Ryan", "Steff"],
      data:   [calc.savings.ryan, calc.savings.steff],
      colors: [colSavings, `${colSavings}90`]
    };
  }, [focus, calc, colMonthly, colExpenses, colSavings]);

  const doughnutData = {
    labels: doughnut.labels,
    datasets: [{ data: doughnut.data, backgroundColor: doughnut.colors, borderWidth: 0 }]
  };
  const doughnutOpts = {
    plugins: { legend: { display:false }, tooltip: { mode:"index", intersect:false } },
    cutout: "60%",
    responsive: true,
    maintainAspectRatio: false
  };

  return (
    <>
      <h1>Budget & Savings Planner</h1>

      <div className="card">
        <div className="row">
          <div>
            <label><Avatar name={profiles.ryan.name} /> {profiles.ryan.name} income</label>
            <div className="space" />
            <input className="input" type="number" value={form.ryanIncome}
                   onChange={e => onChange("ryanIncome", Number(e.target.value))} />
          </div>
          <div>
            <label><Avatar name={profiles.steff.name} /> {profiles.steff.name} income</label>
            <div className="space" />
            <input className="input" type="number" value={form.steffIncome}
                   onChange={e => onChange("steffIncome", Number(e.target.value))} />
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <div>
            <label>Monthly expense budget → <span className="badge">Monthly Expense</span></label>
            <div className="space" />
            <input className="input" type="number" value={form.monthlyBudget}
                   onChange={e => onChange("monthlyBudget", Number(e.target.value))} />
          </div>
          <div>
            <label>Fixed top-up → <span className="badge">Expenses</span></label>
            <div className="space" />
            <input className="input" type="number" value={form.expensesTopUp}
                   onChange={e => onChange("expensesTopUp", Number(e.target.value))} />
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <div>
            <label>Savings % of total income → <span className="badge">Savings</span></label>
            <div className="space" />
            <input className="input" type="number" value={form.savingsRate}
                   onChange={e => onChange("savingsRate", Number(e.target.value))} />
          </div>
          <div>
            <label>Split method</label>
            <div className="space" />
            <select className="select" value={form.splitMethod}
                    onChange={e => onChange("splitMethod", e.target.value)}>
              <option value="equal">Equal 50/50</option>
              <option value="proportional">Proportional to income</option>
              <option value="equal-leftover">Equal leftover</option>
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
            <button className="button" onClick={() => { setSaved(form); setSavedMsg("Saved ✔"); setTimeout(()=>setSavedMsg(""), 1200); }}>Save</button>
            <button className="button secondary" onClick={() => { setForm(saved || defaultForm); setSavedMsg("Loaded"); setTimeout(()=>setSavedMsg(""), 1200); }}>Load saved</button>
            {calc.warn && <span className="muted small" style={{marginLeft:8}}>⚠ {calc.warn}</span>}
            {savedMsg && <span className="muted small" style={{marginLeft:8}}>{savedMsg}</span>}
          </div>
        </div>
      </div>

      {/* Allocation overview + drill-down */}
      <div className="card">
        <div className="section-title">
          <h3>Allocation Overview</h3>
          <div className="chips">
            <div className={`chip monthly ${focus==='monthly' ? 'active':''}`} onClick={()=>setFocus('monthly')}>
              <span className="dot" /> Monthly
            </div>
            <div className={`chip expenses ${focus==='expenses' ? 'active':''}`} onClick={()=>setFocus('expenses')}>
              <span className="dot" /> Expenses
            </div>
            <div className={`chip savings ${focus==='savings' ? 'active':''}`} onClick={()=>setFocus('savings')}>
              <span className="dot" /> Savings
            </div>
            <div className={`chip ${focus==='totals' ? 'active':''}`} onClick={()=>setFocus('totals')}>
              Totals
            </div>
          </div>
        </div>
        <div className="row" style={{alignItems:'center', marginTop: 12}}>
          <div>
            <div className="readonly monosm">Monthly total:  € {fmt(calc.TM)}</div>
            <div className="space" />
            <div className="readonly monosm">Expenses total: € {fmt(calc.TE)}</div>
            <div className="space" />
            <div className="readonly monosm">Savings total:  € {fmt(calc.TS)}</div>
          </div>
          <div className="chart-square">
            <Doughnut data={doughnutData} options={doughnutOpts} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Recommended Contributions</h3>
        <p className="muted small">Remainder stays personal.</p>

        <div className="row" style={{marginTop:12}}>
          <div>
            <strong style={{color:'var(--monthly)'}}>Monthly Expense account</strong>
            <div className="space" />
            <p><Avatar name={profiles.ryan.name} /> {profiles.ryan.name}: € {fmt(calc.monthly.ryan)}</p>
            <p><Avatar name={profiles.steff.name} /> {profiles.steff.name}: € {fmt(calc.monthly.steff)}</p>
            <p className="muted small">Target (total): € {fmt(calc.TM)}</p>
          </div>

          <div>
            <strong style={{color:'var(--expenses)'}}>Expenses account</strong>
            <div className="space" />
            <p><Avatar name={profiles.ryan.name} /> {profiles.ryan.name}: € {fmt(calc.expenses.ryan)}</p>
            <p><Avatar name={profiles.steff.name} /> {profiles.steff.name}: € {fmt(calc.expenses.steff)}</p>
            <p className="muted small">Target (total): € {fmt(calc.TE)}</p>
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <div>
            <strong style={{color:'var(--savings)'}}>Savings</strong>
            <div className="space" />
            <p><Avatar name={profiles.ryan.name} /> {profiles.ryan.name}: € {fmt(calc.savings.ryan)}</p>
            <p><Avatar name={profiles.steff.name} /> {profiles.steff.name}: € {fmt(calc.savings.steff)}</p>
            <p className="muted small">Target (total): € {fmt(calc.TS)}</p>
          </div>

          <div>
            <strong>What’s left for personal accounts</strong>
            <div className="space" />
            <p><Avatar name={profiles.ryan.name} /> {profiles.ryan.name}: <strong>€ {fmt(calc.remR)}</strong></p>
            <p><Avatar name={profiles.steff.name} /> {profiles.steff.name}: <strong>€ {fmt(calc.remS)}</strong></p>
          </div>
        </div>
      </div>
    </>
  );
}
