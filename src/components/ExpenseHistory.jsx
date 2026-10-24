import { List, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { getCategoryClass, getCategoryEmoji, getAvatarColor, getInitials, formatDate } from '../utils/helpers';
import { formatInr, inrToPaise } from '../engine/settlementEngine';

export default function ExpenseHistory({ participants, expenses, handleEditExpense, deleteExpense }) {
  const [expanded, setExpanded] = useState(null);

  const getParticipant = (id) => participants.find((p) => p.id === id);

  const totalPaise = expenses.reduce((sum, e) => sum + inrToPaise(e.amount), 0);

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <div className="section-title-icon">
            <List size={18} />
          </div>
          Expense History
        </div>
        <div className="section-sub">
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · Total {formatInr(totalPaise)}
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🧾</div>
            <h3>No expenses recorded yet</h3>
            <p>Go to "Add Expense" to record your first group expense.</p>
          </div>
        </div>
      ) : (
        <div>
          {[...expenses].reverse().map((e) => {
            const payer = getParticipant(e.payerId);
            const payerIdx = participants.findIndex((p) => p.id === e.payerId);
            const payerColor = getAvatarColor(payerIdx);
            const isExpanded = expanded === e.id;

            return (
              <div key={e.id} className="expense-item">
                <div className="expense-header">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.3rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        flexShrink: 0,
                      }}
                    >
                      {getCategoryEmoji(e.category)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div className="expense-title">{e.title}</div>
                        <span className={`tag ${getCategoryClass(e.category)}`}>{e.category}</span>
                        <span className="tag tag-muted">{e.splitMethod}</span>
                      </div>
                      <div className="expense-meta">
                        <span>Paid by </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{payer?.name || 'Unknown'}</strong>
                        {' · '}{e.splits.length} beneficiar{e.splits.length !== 1 ? 'ies' : 'y'}
                        {e.createdAt && <span> · {formatDate(e.createdAt)}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div className="expense-amount">₹{e.amount}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => setExpanded(isExpanded ? null : e.id)}
                        title="View split details"
                      >
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        Splits
                      </button>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleEditExpense(e)}
                        title="Edit expense"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        className="btn btn-danger btn-xs"
                        onClick={() => {
                          if (window.confirm(`Delete "${e.title}"?`)) deleteExpense(e.id);
                        }}
                        title="Delete expense"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded split details */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: '12px 14px',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: 10,
                      }}
                    >
                      Split Breakdown
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {e.splits.map((s) => {
                        const p = getParticipant(s.participantId);
                        const pIdx = participants.findIndex((pt) => pt.id === s.participantId);
                        const col = getAvatarColor(pIdx);
                        return (
                          <div
                            key={s.participantId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: '0.875rem',
                            }}
                          >
                            <div
                              className="avatar"
                              style={{ background: col.bg, color: col.text }}
                            >
                              {getInitials(p?.name || '?')}
                            </div>
                            <span style={{ flex: 1, fontWeight: 500 }}>{p?.name || 'Unknown'}</span>
                            <span style={{ fontWeight: 700, color: 'var(--warning)' }}>
                              ₹{s.share}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
