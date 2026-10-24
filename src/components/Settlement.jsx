import { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  ChevronRight,
  Info,
  Smartphone,
  Share2,
  Copy,
  Check,
  X,
  CreditCard,
  QrCode,
  Sparkles,
} from 'lucide-react';
import {
  calculateBalances,
  calculateGreedySettlement,
  formatInr,
} from '../engine/settlementEngine';
import { getAvatarColor, getInitials, generateTransferKey } from '../utils/helpers';

export default function Settlement({
  participants,
  expenses,
  completedTransfers,
  markTransferComplete,
  showToast,
}) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [paymentModalTransfer, setPaymentModalTransfer] = useState(null);
  const [payingState, setPayingState] = useState('idle'); // 'idle' | 'processing' | 'success'
  const [copiedSummary, setCopiedSummary] = useState(false);

  const balances = useMemo(
    () => calculateBalances(participants, expenses),
    [participants, expenses]
  );

  const transfers = useMemo(
    () => calculateGreedySettlement(balances),
    [balances]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + Math.round(parseFloat(e.amount) * 100), 0),
    [expenses]
  );

  const pending = transfers.filter((t) => !completedTransfers.includes(generateTransferKey(t)));
  const completed = transfers.filter((t) => completedTransfers.includes(generateTransferKey(t)));

  const isFullySettled = transfers.length > 0 && pending.length === 0;
  const noTransfersNeeded = transfers.length === 0;

  const getParticipantIdx = (id) => participants.findIndex((p) => p.id === id);

  // Copy WhatsApp summary
  const copyGroupSummary = () => {
    let text = `✈ *TripSettle — Expense Settlement Summary*\n`;
    text += `💰 Total Spent: ${formatInr(totalExpenses)}\n`;
    text += `👥 Members: ${participants.length}\n\n`;

    if (pending.length === 0) {
      text += `🎉 All balances are settled! No pending payments.\n`;
    } else {
      text += `📋 *Pending Payments (via GPay / UPI):*\n`;
      pending.forEach((t) => {
        text += `• *${t.fromName}* pays *${t.toName}* ${formatInr(t.amount)}\n`;
      });
    }

    text += `\n_Generated with TripSettle_`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    if (showToast) showToast('Settlement summary copied to clipboard!');
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Open GPay modal
  const openGPayModal = (transfer) => {
    setPaymentModalTransfer(transfer);
    setPayingState('idle');
  };

  // Close modal
  const closeModal = () => {
    setPaymentModalTransfer(null);
    setPayingState('idle');
  };

  // Handle simulated GPay payment
  const handleSimulatePayment = () => {
    if (!paymentModalTransfer) return;
    setPayingState('processing');

    setTimeout(() => {
      setPayingState('success');
      const key = generateTransferKey(paymentModalTransfer);
      markTransferComplete(key);
      if (showToast) {
        showToast(`Payment of ${formatInr(paymentModalTransfer.amount)} to ${paymentModalTransfer.toName} successful!`);
      }
      setTimeout(() => {
        closeModal();
      }, 1500);
    }, 1200);
  };

  const filteredTransfers = useMemo(() => {
    if (activeFilter === 'pending') return pending;
    if (activeFilter === 'completed') return completed;
    return transfers;
  }, [activeFilter, pending, completed, transfers]);

  return (
    <div>
      {/* Top Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="section-title">
            <div className="section-title-icon">
              <ArrowLeftRight size={18} />
            </div>
            Settle Up (GPay / UPI)
          </div>
          <div className="section-sub">
            {transfers.length === 0
              ? 'No payments needed'
              : `${pending.length} pending transfer${pending.length !== 1 ? 's' : ''} to settle up`}
          </div>
        </div>

        {transfers.length > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={copyGroupSummary}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {copiedSummary ? <Check size={14} color="#10b981" /> : <Share2 size={14} />}
            {copiedSummary ? 'Copied!' : 'Share WhatsApp Summary'}
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Trip Expenses</div>
          <div className="stat-value" style={{ color: 'var(--accent-light)' }}>
            {formatInr(totalExpenses)}
          </div>
          <div className="stat-sub">{expenses.length} expenses recorded</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Payments</div>
          <div className="stat-value" style={{ color: pending.length > 0 ? '#f59e0b' : '#10b981' }}>
            {pending.length}
          </div>
          <div className="stat-sub">{completed.length} completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Settlement Status</div>
          <div className="stat-value" style={{ color: isFullySettled ? '#10b981' : 'var(--text-primary)', fontSize: '1.25rem' }}>
            {isFullySettled ? '100% Settled' : transfers.length === 0 ? 'All Clear' : `${Math.round((completed.length / (transfers.length || 1)) * 100)}% Done`}
          </div>
          <div className="stat-sub">
            {completed.length} of {transfers.length} transfers
          </div>
        </div>
      </div>

      {/* All-settled celebration banner */}
      {isFullySettled && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
            color: '#34d399',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={24} />
          <span>🎉 All transfers completed! Everyone is squared away and settled up.</span>
        </div>
      )}

      {noTransfersNeeded && expenses.length > 0 && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius)',
            padding: '16px 20px',
            marginBottom: 24,
            color: '#34d399',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <CheckCircle2 size={24} />
          <span>All balances are zero — everyone has paid their exact fair share!</span>
        </div>
      )}

      {/* Settlement Transfers Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="card-title">
            <Smartphone size={16} className="title-icon" />
            Transfers ({filteredTransfers.length})
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'all', label: `All (${transfers.length})` },
              { id: 'pending', label: `Pending (${pending.length})` },
              { id: 'completed', label: `Settled (${completed.length})` },
            ].map((f) => (
              <button
                key={f.id}
                className={`btn btn-sm ${activeFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '3px 10px', fontSize: '0.75rem', height: 28 }}
                onClick={() => setActiveFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredTransfers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✨</div>
            <h3>No transfers to display</h3>
            <p>
              {activeFilter === 'pending'
                ? 'All transfers are settled!'
                : activeFilter === 'completed'
                ? 'No completed transfers yet'
                : 'Add expenses to see settlements'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredTransfers.map((t) => {
              const fromIdx = getParticipantIdx(t.fromId);
              const toIdx = getParticipantIdx(t.toId);
              const fromColor = getAvatarColor(fromIdx);
              const toColor = getAvatarColor(toIdx);
              const key = generateTransferKey(t);
              const isDone = completedTransfers.includes(key);

              return (
                <div
                  key={key}
                  className={`transfer-card ${isDone ? 'completed' : ''}`}
                  style={{
                    background: isDone ? 'rgba(255, 255, 255, 0.02)' : 'var(--bg-secondary)',
                    border: isDone ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Left: Debtor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 140 }}>
                    <div
                      className="avatar avatar-lg"
                      style={{ background: fromColor.bg, color: fromColor.text }}
                    >
                      {getInitials(t.fromName)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.fromName}</div>
                      <div style={{ fontSize: '0.75rem', color: isDone ? 'var(--text-muted)' : '#f87171' }}>
                        {isDone ? 'paid' : 'owes'}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Amount & Arrow */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: isDone ? '#10b981' : 'var(--text-primary)',
                      }}
                    >
                      {formatInr(t.amount)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <div
                        style={{
                          height: 2,
                          width: 40,
                          background: isDone ? '#10b981' : 'var(--accent)',
                          borderRadius: 1,
                        }}
                      />
                      <ChevronRight size={14} color={isDone ? '#10b981' : 'var(--accent)'} />
                    </div>
                  </div>

                  {/* Right: Creditor */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 140, justifyContent: 'flex-end' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.toName}</div>
                      <div style={{ fontSize: '0.75rem', color: isDone ? '#10b981' : '#34d399' }}>
                        {isDone ? 'received' : 'to receive'}
                      </div>
                    </div>
                    <div
                      className="avatar avatar-lg"
                      style={{ background: toColor.bg, color: toColor.text }}
                    >
                      {getInitials(t.toName)}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 190, justifyContent: 'flex-end' }}>
                    {isDone ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#10b981',
                          background: 'rgba(16, 185, 129, 0.1)',
                          padding: '5px 10px',
                          borderRadius: 20,
                        }}
                      >
                        <CheckCircle2 size={14} /> Settled
                      </span>
                    ) : (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openGPayModal(t)}
                          style={{
                            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                          }}
                          title="Pay via Google Pay / UPI"
                        >
                          <Smartphone size={13} />
                          <span>Pay via GPay</span>
                        </button>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => markTransferComplete(key)}
                          title="Mark as paid without UPI"
                        >
                          <Check size={13} /> Paid
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Individual Balances Breakdown */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Info size={16} className="title-icon" />
            Individual Balances
          </div>
        </div>

        {participants.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No participants</h3>
          </div>
        ) : (
          [...balances.entries()].map(([id, b], idx) => {
            const color = getAvatarColor(idx);
            const isPositive = b.net > 0;
            const isNegative = b.net < 0;

            return (
              <div key={id} className="balance-row">
                <div
                  className="avatar avatar-lg"
                  style={{ background: color.bg, color: color.text }}
                >
                  {getInitials(b.name)}
                </div>
                <div className="balance-meta">
                  <div className="balance-name">{b.name}</div>
                  <div className="balance-detail">
                    Paid <strong>{formatInr(b.paid)}</strong> · Fair share <strong>{formatInr(b.fairShare)}</strong>
                  </div>
                </div>
                <div className={`balance-net ${isPositive ? 'text-positive' : isNegative ? 'text-negative' : 'text-neutral'}`}>
                  {isPositive ? `+${formatInr(b.net)}` : isNegative ? `-${formatInr(-b.net)}` : '₹0'}
                  <div style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)', marginTop: 2 }}>
                    {isPositive ? 'gets back' : isNegative ? 'owes' : 'settled'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── GPay UPI Payment Modal ────────────────────────────── */}
      {paymentModalTransfer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              width: '100%',
              maxWidth: 420,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '14px',
                  }}
                >
                  G
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Google Pay UPI</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fast & Secure Settlement</div>
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Recipient Details */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                textAlign: 'center',
                marginBottom: 20,
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="avatar avatar-lg"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  margin: '0 auto 10px',
                  width: 52,
                  height: 52,
                  fontSize: '1.2rem',
                }}
              >
                {getInitials(paymentModalTransfer.toName)}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{paymentModalTransfer.toName}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                UPI ID: <span style={{ color: 'var(--accent-light)' }}>{paymentModalTransfer.toName.toLowerCase()}@okhdfcbank</span>
              </div>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: '#fff',
                  marginTop: 14,
                  letterSpacing: '-0.5px',
                }}
              >
                {formatInr(paymentModalTransfer.amount)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Paying from <strong>{paymentModalTransfer.fromName}</strong>
              </div>
            </div>

            {/* QR / Intent Link info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                marginBottom: 20,
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 8,
              }}
            >
              <QrCode size={16} color="var(--accent-light)" />
              <span>UPI Deep-Link & QR ready for instant mobile transfer</span>
            </div>

            {/* Action Buttons */}
            {payingState === 'idle' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSimulatePayment}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    height: 46,
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                  }}
                >
                  <Sparkles size={16} /> Pay {formatInr(paymentModalTransfer.amount)} with GPay
                </button>

                <a
                  href={`upi://pay?pa=${paymentModalTransfer.toName.toLowerCase()}@okhdfcbank&pn=${encodeURIComponent(paymentModalTransfer.toName)}&am=${(paymentModalTransfer.amount / 100).toFixed(2)}&cu=INR`}
                  className="btn btn-secondary"
                  style={{
                    height: 42,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    textDecoration: 'none',
                  }}
                  onClick={() => {
                    const key = generateTransferKey(paymentModalTransfer);
                    markTransferComplete(key);
                    closeModal();
                  }}
                >
                  <Smartphone size={15} /> Open External UPI App
                </a>
              </div>
            )}

            {payingState === 'processing' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    border: '3px solid rgba(37, 99, 235, 0.2)',
                    borderTopColor: '#2563eb',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 14px',
                  }}
                />
                <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Processing UPI Payment…</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Contacting UPI switch & bank server…
                </div>
              </div>
            )}

            {payingState === 'success' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    fontSize: '24px',
                  }}
                >
                  ✓
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#10b981' }}>
                  Payment Successful!
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Settlement recorded successfully
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
