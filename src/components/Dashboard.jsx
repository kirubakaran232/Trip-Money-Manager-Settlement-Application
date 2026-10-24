import { useMemo } from 'react';
import { LayoutDashboard, TrendingUp, Users, Receipt, ArrowLeftRight } from 'lucide-react';
import { calculateBalances, formatInr } from '../engine/settlementEngine';
import { getAvatarColor, getInitials } from '../utils/helpers';

export default function Dashboard({ participants, expenses, setActiveTab }) {
  const balances = useMemo(
    () => calculateBalances(participants, expenses),
    [participants, expenses]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + Math.round(parseFloat(e.amount) * 100), 0),
    [expenses]
  );

  const settledCount = useMemo(
    () => [...balances.values()].filter((b) => b.net === 0).length,
    [balances]
  );

  return (
    <div>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="section-title">
            <div className="section-title-icon">
              <LayoutDashboard size={18} />
            </div>
            Dashboard
          </div>
          <div className="section-sub">Overview of your group trip finances</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setActiveTab('add-expense')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>+</span> Split a Bill
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab('settlement')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>⚡</span> Settle Up
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Receipt size={22} /></div>
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value" style={{ color: 'var(--accent-light)' }}>
            {formatInr(totalExpenses)}
          </div>
          <div className="stat-sub">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Users size={22} /></div>
          <div className="stat-label">Participants</div>
          <div className="stat-value">{participants.length}</div>
          <div className="stat-sub">{settledCount} settled</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><TrendingUp size={22} /></div>
          <div className="stat-label">Avg per Person</div>
          <div className="stat-value">
            {participants.length > 0 ? formatInr(Math.round(totalExpenses / participants.length)) : '₹0'}
          </div>
          <div className="stat-sub">equal split estimate</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><ArrowLeftRight size={22} /></div>
          <div className="stat-label">Unsettled</div>
          <div className="stat-value" style={{ color: 'var(--danger-light)' }}>
            {[...balances.values()].filter((b) => b.net < 0).length}
          </div>
          <div className="stat-sub">people owe money</div>
        </div>
      </div>

      {/* Balances overview */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">
            <Users size={16} className="title-icon" />
            Participant Balances
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('settlement')}>
            View Settlement →
          </button>
        </div>

        {participants.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No participants yet</h3>
            <p>Add participants to start tracking expenses</p>
          </div>
        ) : (
          [...balances.entries()].map(([id, b], idx) => {
            const color = getAvatarColor(idx);
            const initials = getInitials(b.name);
            const isPositive = b.net > 0;
            const isNegative = b.net < 0;
            const paidPct = b.paid > 0 || b.fairShare > 0
              ? Math.round((b.paid / (b.paid + b.fairShare || 1)) * 100)
              : 50;

            return (
              <div key={id} className="balance-row">
                <div
                  className="avatar avatar-lg"
                  style={{ background: color.bg, color: color.text }}
                >
                  {initials}
                </div>
                <div className="balance-meta">
                  <div className="balance-name">{b.name}</div>
                  <div className="balance-detail">
                    Paid {formatInr(b.paid)} · Fair share {formatInr(b.fairShare)}
                  </div>
                  <div className="progress-bar" style={{ width: '180px' }}>
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(100, paidPct)}%` }}
                    />
                  </div>
                </div>
                <div className={`balance-net ${isPositive ? 'text-positive' : isNegative ? 'text-negative' : 'text-neutral'}`}>
                  {isPositive ? '+' : ''}{formatInr(b.net)}
                  <div style={{ fontSize: '0.7rem', fontWeight: 400, marginTop: 2, color: 'var(--text-muted)' }}>
                    {isPositive ? 'to receive' : isNegative ? 'to pay' : 'settled'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Recent expenses */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Receipt size={16} className="title-icon" />
            Recent Expenses
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('history')}>
            View All →
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧾</div>
            <h3>No expenses yet</h3>
            <p>Add your first expense to get started</p>
          </div>
        ) : (
          expenses.slice(-3).reverse().map((e) => {
            const payer = participants.find((p) => p.id === e.payerId);
            return (
              <div key={e.id} className="expense-item">
                <div className="expense-header">
                  <div>
                    <div className="expense-title">{e.title}</div>
                    <div className="expense-meta">
                      Paid by {payer?.name || 'Unknown'} · {e.splits.length} beneficiar{e.splits.length === 1 ? 'y' : 'ies'}
                    </div>
                  </div>
                  <div className="expense-amount">₹{e.amount}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
