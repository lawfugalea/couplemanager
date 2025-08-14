import { requireAuth } from "@/lib/auth";
import Link from "next/link";

export default function Home() {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Smart Money Management
            <br />
            <span style={{ background: 'linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Made Simple
            </span>
          </h1>
          <p className="hero-subtitle">
            Track expenses, plan budgets, and grow your savings together. 
            Beautiful, intuitive tools for couples who want to build their financial future.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/shopping" className="btn btn-primary btn-lg">
              🛒 Start Shopping
            </Link>
            <Link href="/finance" className="btn btn-secondary btn-lg">
              📊 Plan Budget
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">€2,450</div>
          <div className="stat-label">Monthly Budget</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">€850</div>
          <div className="stat-label">This Month</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">€12,300</div>
          <div className="stat-label">Total Savings</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">23</div>
          <div className="stat-label">Shopping Items</div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">🛒 Smart Shopping</h3>
              <p className="card-subtitle">Collaborative grocery lists with price tracking</p>
            </div>
          </div>
          <p className="text-secondary mb-6">
            Add items, track prices, and shop together efficiently. Never forget milk again!
          </p>
          <Link href="/shopping" className="btn btn-primary">
            Open Shopping List
          </Link>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">📊 Budget Planner</h3>
              <p className="card-subtitle">Split expenses and track contributions</p>
            </div>
          </div>
          <p className="text-secondary mb-6">
            Set budgets, split costs fairly, and see exactly where your money goes each month.
          </p>
          <Link href="/finance" className="btn btn-primary">
            Plan Budget
          </Link>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">📈 Savings Goals</h3>
              <p className="card-subtitle">Project and track your financial growth</p>
            </div>
          </div>
          <p className="text-secondary mb-6">
            Visualize your savings growth with beautiful charts and realistic projections.
          </p>
          <Link href="/savings" className="btn btn-primary">
            View Projections
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mt-8">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div className="flex gap-4 flex-wrap">
          <Link href="/shopping" className="btn btn-ghost">
            ➕ Add Shopping Item
          </Link>
          <Link href="/finance" className="btn btn-ghost">
            💰 Update Budget
          </Link>
          <Link href="/household" className="btn btn-ghost">
            👥 Manage Household
          </Link>
          <Link href="/settings" className="btn btn-ghost">
            ⚙️ Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = requireAuth();