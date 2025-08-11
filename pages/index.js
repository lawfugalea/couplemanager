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
