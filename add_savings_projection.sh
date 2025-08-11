#!/usr/bin/env bash
set -euo pipefail

echo "==> Checking project root..."
if [ ! -f package.json ]; then
  echo "ERROR: package.json not found. Run this from your Next.js project root."
  exit 1
fi

echo "==> Installing Recharts..."
npm i recharts

mkdir -p components pages/tools

COMPONENT_PATH="components/SavingsProjection.jsx"
PAGE_PATH="pages/savings-projection.js"

echo "==> Creating ${COMPONENT_PATH} ..."
cat > "${COMPONENT_PATH}" <<'EOF'
import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

/**
 * SavingsProjection
 * Reads current Savings from localStorage key: financeData.accounts["Savings"]
 * and projects growth with monthly contributions + optional annual interest.
 */
export default function SavingsProjection() {
  const [currentBalance, setCurrentBalance] = useState(0);
  const [monthlyContribution, setMonthlyContribution] = useState(200);
  const [annualInterestPct, setAnnualInterestPct] = useState(0);
  const [months, setMonths] = useState(12);
  const [targetAmount, setTargetAmount] = useState(5000);
  const [useCompounding, setUseCompounding] = useState(true);

  // Load current balance from localStorage once
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("financeData") : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const savings = parsed?.accounts?.["Savings"];
      if (typeof savings === "number") setCurrentBalance(savings);
    } catch (e) {
      console.warn("Could not parse financeData from localStorage", e);
    }
  }, []);

  const monthlyRate = useMemo(() => (annualInterestPct || 0) / 100 / 12, [annualInterestPct]);

  const { data, endBalance, monthsToTarget } = useMemo(() => {
    const points = [];
    let bal = currentBalance;
    let hitTargetAt = null;

    for (let i = 1; i <= months; i++) {
      if (useCompounding && monthlyRate > 0) {
        bal = bal * (1 + monthlyRate) + monthlyContribution;
      } else {
        bal = bal + monthlyContribution;
      }
      if (hitTargetAt === null && bal >= targetAmount) hitTargetAt = i;
      points.push({ month: `M${i}`, balance: Math.round(bal * 100) / 100 });
    }

    return { data: points, endBalance: bal, monthsToTarget: hitTargetAt };
  }, [currentBalance, monthlyContribution, months, monthlyRate, useCompounding, targetAmount]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Savings projection</h2>
          <p className="text-sm text-gray-500">
            Plan how your savings could grow over time based on your monthly contribution.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase text-gray-500">Current balance</div>
          <div className="text-2xl font-bold">
            €{currentBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Control label="Monthly contribution (€)">
          <input
            type="number"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-200 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            min={0}
            step={10}
          />
        </Control>
        <Control label="Months to project">
          <input
            type="number"
            value={months}
            onChange={(e) => setMonths(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-xl border border-gray-200 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            min={1}
            step={1}
          />
        </Control>
        <Control label="Annual interest (%)">
          <input
            type="number"
            value={annualInterestPct}
            onChange={(e) => setAnnualInterestPct(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-xl border border-gray-200 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            min={0}
            step={0.1}
          />
        </Control>
        <Control label="Target amount (€)">
          <input
            type="number"
            value={targetAmount}
            onChange={(e) => setTargetAmount(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-xl border border-gray-200 bg-white/5 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            min={0}
            step={50}
          />
        </Control>
        <Control label="Compounding">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setUseCompounding(true)}
              className={`px-3 py-2 rounded-lg border ${
                useCompounding ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200"
              }`}
            >
              On
            </button>
            <button
              onClick={() => setUseCompounding(false)}
              className={`px-3 py-2 rounded-lg border ${
                !useCompounding ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200"
              }`}
            >
              Off
            </button>
          </div>
        </Control>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard
          title="Projected balance"
          value={`€${endBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          hint={`${months} months`}
        />
        <KpiCard
          title="Monthly gain vs now"
          value={`€${(endBalance - currentBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          hint={`includes contributions${annualInterestPct > 0 ? " + interest" : ""}`}
        />
        <KpiCard
          title="Time to target"
          value={monthsToTarget ? `${monthsToTarget} months` : "—"}
          hint={monthsToTarget ? "reach target within horizon" : "not reached within horizon"}
        />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-gray-200 p-3 sm:p-4 bg-white/5">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="month" tickMargin={8} />
              <YAxis tickFormatter={(v) => `€${v}`} width={70} />
              <Tooltip formatter={(val) => `€${Number(val).toLocaleString()}`} />
              <Line type="monotone" dataKey="balance" strokeWidth={3} dot={false} />
              <ReferenceLine
                y={targetAmount}
                strokeDasharray="6 6"
                label={{ value: `Target €${targetAmount}`, position: "insideTopRight" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Note: This is a projection tool. Actual results depend on real deposits/withdrawals and your bank's interest policy.
      </p>
    </div>
  );
}

function Control({ label, children }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-gray-600">{label}</div>
      {children}
    </label>
  );
}

function KpiCard({ title, value, hint }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-white/40 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
    </div>
  );
}
EOF

echo "==> Creating ${PAGE_PATH} ..."
cat > "${PAGE_PATH}" <<'EOF'
import dynamic from "next/dynamic";

const SavingsProjection = dynamic(() => import("../../components/SavingsProjection"), {
  ssr: false, // because it uses localStorage
});

export default function SavingsProjectionPage() {
  return (
    <main className="min-h-screen w-full p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Savings Projection</h1>
        <p className="text-gray-600 mb-6">
          This page renders the Savings Projection widget. You can integrate the component inside your
          existing Finance page's <strong>Savings</strong> section at any time.
        </p>
        <SavingsProjection />
      </div>
    </main>
  );
}
EOF

# Optional: try to locate a finance page and add an import hint (non-destructive)
FINANCE_CANDIDATE=""
for f in pages/finance.js pages/finance.jsx pages/Finance.jsx pages/Finance.js; do
  if [ -f "$f" ]; then
    FINANCE_CANDIDATE="$f"
    break
  fi
done

if [ -n "${FINANCE_CANDIDATE}" ]; then
  TS=$(date +"%Y%m%d-%H%M%S")
  cp "${FINANCE_CANDIDATE}" "${FINANCE_CANDIDATE}.bak-${TS}"
  # Add an import line if not present and a mount hint comment
  if ! grep -q "components/SavingsProjection" "${FINANCE_CANDIDATE}"; then
    # Put import after first import line
    awk '
      BEGIN{added=0}
      /^import / && added==0 {print $0; print "import dynamic from \"next/dynamic\";"; print "const SavingsProjection = dynamic(() => import(\"../components/SavingsProjection\"), { ssr: false });"; added=1; next}
      {print $0}
    ' "${FINANCE_CANDIDATE}" > "${FINANCE_CANDIDATE}.tmp" && mv "${FINANCE_CANDIDATE}.tmp" "${FINANCE_CANDIDATE}"
  fi
  # Append a marker comment at end so you know where to mount
  if ! grep -q "SAVINGS_PROJECTION_MOUNT" "${FINANCE_CANDIDATE}"; then
    echo -e "\n{/* SAVINGS_PROJECTION_MOUNT: Place <SavingsProjection /> inside your Savings tab content */}\n" >> "${FINANCE_CANDIDATE}"
  fi
  echo "==> Patched ${FINANCE_CANDIDATE} (backup at ${FINANCE_CANDIDATE}.bak-${TS})"
fi

echo "==> Done."
echo
echo "Next steps:"
echo "  1) Start dev server:  npm run dev"
echo "  2) Visit:             http://localhost:3000/savings-projection"
echo "  3) (Optional) In your Finance page, inside the Savings tab content, add:"
echo "         <SavingsProjection />"
