import { requireAuth } from "@/lib/auth";
import { useMemo, useState, useEffect, useRef } from "react";
import { Line } from "@/components/Charts";
import { themedDefaults, makeAreaGradient } from "@/components/Charts";
import useLocalStorage from "@/utils/useLocalStorage";

export default function SavingsProjection() {
  // Pull monthly savings from the Budget page
  const [savedFinance] = useLocalStorage("finance-form", {
    ryanIncome: 0, steffIncome: 0, monthlyBudget: 0, expensesTopUp: 0, savingsRate: 20, splitMethod: "equal"
  });

  // Projection inputs
  const [currentBalance, setCurrentBalance] = useLocalStorage("savings-current-balance", 0);
  const [annualRate, setAnnualRate] = useLocalStorage("savings-annual-rate", 1.5); // %
  const [months, setMonths] = useLocalStorage("savings-months", 18);
  const [extraMonthly, setExtraMonthly] = useLocalStorage("savings-extra-monthly", 0);
  const [goal, setGoal] = useLocalStorage("savings-goal", 5000);
  const [showGoal, setShowGoal] = useLocalStorage("savings-show-goal", true);

  // NEW: choose the start month (defaults to current month)
  const defaultStartYM = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    return `${y}-${m}`;
  })();
  const [startMonth, setStartMonth] = useLocalStorage("savings-start-month", defaultStartYM);

  // derive monthly savings from finance form (sum only matters)
  const derivedMonthlySavings = useMemo(() => {
    const r = +savedFinance.ryanIncome || 0;
    const s = +savedFinance.steffIncome || 0;
    const total = r + s;
    if (total <= 0) return 0;
    return (Math.max(0, +savedFinance.savingsRate || 0) / 100) * total;
  }, [savedFinance]);

  const [monthlySavings, setMonthlySavings] = useLocalStorage("savings-monthly-contrib", derivedMonthlySavings);
  useEffect(() => {
    if (!monthlySavings || monthlySavings === 0) setMonthlySavings(derivedMonthlySavings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedMonthlySavings]);

  // Projection math
  const projection = useMemo(() => {
    const arr = [];
    const rMonthly = (+annualRate || 0) / 100 / 12;
    let bal = +currentBalance || 0;
    const contrib = (+monthlySavings || 0) + (+extraMonthly || 0);
    for (let m = 1; m <= (+months || 0); m++) {
      bal = bal * (1 + rMonthly) + contrib;
      arr.push({ monthIndex: m-1, balance: bal });
    }
    return arr;
  }, [currentBalance, annualRate, months, monthlySavings, extraMonthly]);

  // Build real month labels from startMonth
  const startDate = useMemo(() => {
    // startMonth is "YYYY-MM"
    const y = Number(String(startMonth).slice(0,4)) || new Date().getFullYear();
    const m = Number(String(startMonth).slice(5,7)) - 1;
    return new Date(y, isNaN(m)?0:m, 1);
  }, [startMonth]);

  const monthLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i < projection.length; i++) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      // e.g., "Aug 2025"
      labels.push(d.toLocaleString(undefined, { month: "short", year: "numeric" }));
    }
    return labels;
  }, [projection.length, startDate]); // length only to avoid re-run for every balance change

  const last = projection[projection.length - 1]?.balance || 0;
  const contributed = (+monthlySavings + +extraMonthly) * (+months || 0);
  const interestEarned = Math.max(0, last - (+currentBalance || 0) - contributed);

  const canvasRef = useRef(null);
  const theme = themedDefaults();

  const chartData = useMemo(() => {
    const baseColor = theme.accent;
    let fill;
    if (canvasRef.current) {
      const ctx = canvasRef.current.firstChild?.getContext?.("2d");
      if (ctx) fill = makeAreaGradient(ctx, baseColor, 0.25, 0.02);
    }
    const datasets = [{
      label: "Projected Balance",
      data: projection.map(p => p.balance),
      tension: 0.22,
      borderWidth: 2,
      borderColor: baseColor,
      pointRadius: 0,
      fill: true,
      backgroundColor: fill || baseColor
    }];
    if (showGoal && goal > 0 && projection.length) {
      datasets.push({
        label: "Goal",
        data: Array(projection.length).fill(+goal),
        borderDash: [6,6],
        borderWidth: 2,
        pointRadius: 0,
        borderColor: "#7bd389"
      });
    }
    return { labels: monthLabels, datasets };
  }, [projection, showGoal, goal, theme, canvasRef, monthLabels]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index", intersect: false }
    },
    scales: {
      x: {
        grid: { color: theme.grid },
        ticks: { color: theme.ticks, maxTicksLimit: 12 }
      },
      y: {
        grid: { color: theme.grid },
        ticks: {
          color: theme.ticks,
          callback: v => `€ ${Number(v).toLocaleString()}`
        }
      }
    }
  }), [theme]);

  const fmt = (x) => Number.isFinite(x) ? x.toFixed(2) : "0.00";

  return (
    <>
      <h1>Savings Projection</h1>

      <div className="card">
        <div className="row">
          <div>
            <label>Current savings balance</label>
            <div className="space" />
            <input className="input" type="number" value={currentBalance}
                   onChange={e => setCurrentBalance(+e.target.value)} />
          </div>
          <div>
            <label>Annual interest rate (%)</label>
            <div className="space" />
            <input className="input" type="number" value={annualRate}
                   onChange={e => setAnnualRate(+e.target.value)} />
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <div>
            <label>Months to project</label>
            <div className="space" />
            <input className="input" type="number" value={months}
                   onChange={e => setMonths(+e.target.value)} />
          </div>
          <div>
            <label>Monthly savings (auto from Budget, override here)</label>
            <div className="space" />
            <input className="input" type="number" value={monthlySavings}
                   onChange={e => setMonthlySavings(+e.target.value)} />
          </div>
        </div>

        {/* NEW: Start month chooser */}
        <div className="row" style={{marginTop:12}}>
          <div>
            <label>Start month</label>
            <div className="space" />
            <input className="input" type="month" value={startMonth}
                   onChange={e => setStartMonth(e.target.value)} />
          </div>
          <div>
            <label>Extra monthly amount (optional)</label>
            <div className="space" />
            <input className="input" type="number" value={extraMonthly}
                   onChange={e => setExtraMonthly(+e.target.value)} />
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <div className="readonly monosm">Contributed: € {fmt(contributed)}</div>
          <div className="readonly monosm">Interest: € {fmt(interestEarned)}</div>
        </div>
      </div>

      <div className="card chart-box" ref={canvasRef}>
        <h3>Projection</h3>
        <div className="space" />
        <Line data={chartData} options={chartOptions} />
      </div>
    </>
  );
}

export const getServerSideProps = requireAuth();
