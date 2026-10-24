import { useState } from 'react';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import { getAvatarColor, getInitials } from '../utils/helpers';
// Safe-delete enforced server-side: MongoDB checks if participant is referenced in any expense

export default function Participants({ participants, expenses, addParticipant, removeParticipant }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Name cannot be empty'); return; }
    // Optimistic duplicate check (server also validates)
    if (participants.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Participant already exists');
      return;
    }
    addParticipant(trimmed);
    setName('');
    setError('');
  };

  const expCountFor = (id) =>
    expenses.filter(
      (e) => e.payerId === id || e.splits.some((s) => s.participantId === id)
    ).length;

  const isUsed = (id) => expCountFor(id) > 0;

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <div className="section-title-icon"><Users size={18} /></div>
          Participants
        </div>
        <div className="section-sub">Manage who is part of this trip</div>
      </div>

      {/* Add form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>
          <UserPlus size={16} className="title-icon" />
          Add Participant
        </div>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <input
              className="form-input"
              placeholder="Enter participant name…"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              maxLength={40}
            />
            {error && <div className="form-error">⚠ {error}</div>}
          </div>
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            <UserPlus size={15} /> Add
          </button>
        </form>
      </div>

      {/* Participant list */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Users size={16} className="title-icon" />
            All Participants ({participants.length})
          </div>
        </div>

        {participants.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No participants yet</h3>
            <p>Add at least two people to start splitting expenses.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {participants.map((p, idx) => {
              const color = getAvatarColor(idx);
              const initials = getInitials(p.name);
              const used = isUsed(p.id);
              const count = expCountFor(p.id);

              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <div className="avatar avatar-lg" style={{ background: color.bg, color: color.text }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {count > 0
                        ? `Involved in ${count} expense${count !== 1 ? 's' : ''}`
                        : 'No expenses yet'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>
                      ID: {p.id}
                    </div>
                  </div>

                  {used ? (
                    <span className="tag tag-muted" title="Participant is referenced in expenses">
                      In use
                    </span>
                  ) : (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeParticipant(p.id)}
                      title="Remove participant (server validates no expense references)"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
