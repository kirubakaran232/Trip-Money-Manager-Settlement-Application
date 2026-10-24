import { useState, useEffect } from 'react';
import { PlusCircle, DollarSign, Check, Users } from 'lucide-react';
import { calculateEqualSplits, inrToPaise, paiseToInr } from '../engine/settlementEngine';
import { CATEGORIES, getCategoryEmoji, getAvatarColor, getInitials } from '../utils/helpers';

export default function AddExpense({
  participants,
  addExpense,
  updateExpense,
  editingExpense,
  setEditingExpense,
  showToast,
  setActiveTab,
}) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Food',
    payerId: participants[0]?.id || '',
    splitMethod: 'equal',
    beneficiaryIds: participants.map((p) => p.id),
    customShares: {},
  });
  const [errors, setErrors] = useState({});

  // When participants load and form is empty, set default payer and select all beneficiaries
  useEffect(() => {
    if (!editingExpense && participants.length > 0) {
      setForm((prev) => ({
        ...prev,
        payerId: prev.payerId || participants[0]?.id || '',
        beneficiaryIds: prev.beneficiaryIds.length > 0 ? prev.beneficiaryIds : participants.map((p) => p.id),
      }));
    }
  }, [participants, editingExpense]);

  // Load editing expense into form
  useEffect(() => {
    if (editingExpense) {
      const bids = editingExpense.splits.map((s) => s.participantId);
      const custom = {};
      editingExpense.splits.forEach((s) => { custom[s.participantId] = s.share; });
      setForm({
        title: editingExpense.title,
        amount: editingExpense.amount,
        category: editingExpense.category,
        payerId: editingExpense.payerId,
        splitMethod: editingExpense.splitMethod,
        beneficiaryIds: bids,
        customShares: custom,
      });
    }
    setErrors({});
  }, [editingExpense]);

  // Auto-recalculate equal splits when beneficiaries or amount changes
  useEffect(() => {
    if (form.splitMethod === 'equal' && form.beneficiaryIds.length > 0 && form.amount) {
      const splits = calculateEqualSplits(form.beneficiaryIds, form.amount);
      const custom = {};
      splits.forEach((s) => { custom[s.participantId] = s.share; });
      setForm((prev) => ({ ...prev, customShares: custom }));
    }
  }, [form.beneficiaryIds, form.amount, form.splitMethod]);

  const toggleBeneficiary = (id) => {
    setForm((prev) => {
      const isAlreadySelected = prev.beneficiaryIds.includes(id);
      const newBeneficiaryIds = isAlreadySelected
        ? prev.beneficiaryIds.filter((b) => b !== id)
        : [...prev.beneficiaryIds, id];

      // If in custom split and adding participant, initialize share to 0
      const newShares = { ...prev.customShares };
      if (!isAlreadySelected && !newShares[id]) {
        newShares[id] = '0.00';
      }

      return {
        ...prev,
        beneficiaryIds: newBeneficiaryIds,
        customShares: newShares,
      };
    });
    setErrors((prev) => ({ ...prev, beneficiaries: undefined }));
  };

  const selectAllBeneficiaries = () => {
    setForm((prev) => ({
      ...prev,
      beneficiaryIds: participants.map((p) => p.id),
    }));
    setErrors((prev) => ({ ...prev, beneficiaries: undefined }));
  };

  const deselectAllBeneficiaries = () => {
    setForm((prev) => ({
      ...prev,
      beneficiaryIds: [],
    }));
  };

  const setCustomShare = (id, val) => {
    setForm((prev) => ({ ...prev, customShares: { ...prev.customShares, [id]: val } }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
      errs.amount = 'Enter a valid positive amount';
    if (!form.payerId) errs.payerId = 'Select who paid';
    if (form.beneficiaryIds.length === 0) errs.beneficiaries = 'Select at least one beneficiary';

    if (form.splitMethod === 'custom') {
      const totalPaise = inrToPaise(form.amount);
      const splitTotal = form.beneficiaryIds.reduce((sum, id) => {
        const val = parseFloat(form.customShares[id] || 0);
        return sum + Math.round(val * 100);
      }, 0);
      if (splitTotal !== totalPaise) {
        errs.customShares = `Shares total ₹${(splitTotal / 100).toFixed(2)} but expense is ₹${parseFloat(form.amount).toFixed(2)}. Difference: ₹${((totalPaise - splitTotal) / 100).toFixed(2)}`;
      }
      form.beneficiaryIds.forEach((id) => {
        const val = parseFloat(form.customShares[id] || 0);
        if (isNaN(val) || val < 0) {
          errs[`share_${id}`] = 'Invalid amount';
        }
      });
    }

    return errs;
  };

  const buildSplits = () => {
    if (form.splitMethod === 'equal') {
      return calculateEqualSplits(form.beneficiaryIds, form.amount);
    }
    return form.beneficiaryIds.map((id) => ({
      participantId: id,
      share: parseFloat(form.customShares[id] || 0).toFixed(2),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const splits = buildSplits();
    const expense = {
      ...(editingExpense ? { id: editingExpense.id, createdAt: editingExpense.createdAt } : {}),
      title: form.title.trim(),
      amount: parseFloat(form.amount).toFixed(2),
      category: form.category,
      payerId: form.payerId,
      splitMethod: form.splitMethod,
      splits,
    };

    if (editingExpense) {
      updateExpense(expense);
      setEditingExpense(null);
    } else {
      addExpense(expense);
    }

    // Reset to fresh form
    setForm({
      title: '',
      amount: '',
      category: 'Food',
      payerId: participants[0]?.id || '',
      splitMethod: 'equal',
      beneficiaryIds: participants.map((p) => p.id),
      customShares: {},
    });
    setErrors({});
  };

  const cancelEdit = () => {
    setEditingExpense(null);
    setForm({
      title: '',
      amount: '',
      category: 'Food',
      payerId: participants[0]?.id || '',
      splitMethod: 'equal',
      beneficiaryIds: participants.map((p) => p.id),
      customShares: {},
    });
    setErrors({});
  };

  const customTotal = form.beneficiaryIds.reduce((sum, id) => {
    return sum + (parseFloat(form.customShares[id] || 0) || 0);
  }, 0);

  const expenseAmt = parseFloat(form.amount) || 0;
  const customDiff = Math.round((expenseAmt - customTotal) * 100);

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <div className="section-title-icon">
            <PlusCircle size={18} />
          </div>
          {editingExpense ? 'Edit Expense' : 'Add Expense / Split Bill'}
        </div>
        <div className="section-sub">
          {editingExpense ? 'Update expense details below' : 'Record a group expense and split it instantly'}
        </div>
      </div>

      {participants.length < 2 && (
        <div className="info-box" style={{ marginBottom: 20 }}>
          ⚠️ You need at least <strong>2 participants</strong> before adding expenses.
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Expense Description</label>
            <input
              className="form-input"
              placeholder="e.g. Goa Dinner, Uber to Airport, Beach Villa…"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={80}
            />
            {errors.title && <div className="form-error">⚠ {errors.title}</div>}
          </div>

          {/* Amount + Category */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              {errors.amount && <div className="form-error">⚠ {errors.amount}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{getCategoryEmoji(c)} {c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Paid by */}
          <div className="form-group">
            <label className="form-label">Who Paid?</label>
            <div className="checkbox-group">
              {participants.map((p, idx) => {
                const color = getAvatarColor(idx);
                const isSelected = form.payerId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`checkbox-chip ${isSelected ? 'selected' : ''}`}
                    style={isSelected ? { borderColor: color.bg, background: 'rgba(99, 102, 241, 0.15)' } : {}}
                    onClick={() => setForm((prev) => ({ ...prev, payerId: p.id }))}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: isSelected ? 'none' : '1.5px solid var(--border)',
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {isSelected ? '●' : ''}
                    </div>
                    <div
                      className="avatar"
                      style={{ background: color.bg, color: color.text }}
                    >
                      {getInitials(p.name)}
                    </div>
                    <span style={{ fontWeight: isSelected ? 700 : 500 }}>{p.name}</span>
                  </button>
                );
              })}
            </div>
            {errors.payerId && <div className="form-error">⚠ {errors.payerId}</div>}
          </div>

          {/* Beneficiaries (Shared among) */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Shared among ({form.beneficiaryIds.length} selected)
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 10px', fontSize: '0.75rem', height: 26 }}
                  onClick={selectAllBeneficiaries}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 10px', fontSize: '0.75rem', height: 26 }}
                  onClick={deselectAllBeneficiaries}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="checkbox-group">
              {participants.map((p, idx) => {
                const color = getAvatarColor(idx);
                const selected = form.beneficiaryIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`checkbox-chip ${selected ? 'selected' : ''}`}
                    style={selected ? { borderColor: color.bg, background: 'rgba(99, 102, 241, 0.15)' } : {}}
                    onClick={() => toggleBeneficiary(p.id)}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: selected ? 'none' : '1.5px solid var(--border)',
                        background: selected ? 'var(--accent)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {selected ? '✓' : ''}
                    </div>
                    <div className="avatar" style={{ background: color.bg, color: color.text }}>
                      {getInitials(p.name)}
                    </div>
                    <span style={{ fontWeight: selected ? 700 : 500 }}>{p.name}</span>
                  </button>
                );
              })}
            </div>
            {errors.beneficiaries && <div className="form-error">⚠ {errors.beneficiaries}</div>}
          </div>

          {/* Split method */}
          <div className="form-group">
            <label className="form-label">How to Split</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['equal', 'custom'].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`btn ${form.splitMethod === m ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setForm({ ...form, splitMethod: m })}
                >
                  {m === 'equal' ? '⚖ Split Equally' : '✏ Custom Amounts'}
                </button>
              ))}
            </div>

            {form.splitMethod === 'equal' && form.beneficiaryIds.length > 0 && form.amount && (
              <div
                style={{
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  color: 'var(--accent-light)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>⚖</span>
                <span>
                  Each person pays{' '}
                  <strong>
                    ₹{(parseFloat(form.amount) / form.beneficiaryIds.length).toFixed(2)}
                  </strong>{' '}
                  ({form.beneficiaryIds.length} people)
                </span>
              </div>
            )}

            {form.splitMethod === 'custom' && form.beneficiaryIds.length > 0 && (
              <div>
                <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
                  {form.beneficiaryIds.map((id) => {
                    const p = participants.find((p) => p.id === id);
                    const idx = participants.findIndex((p) => p.id === id);
                    const color = getAvatarColor(idx);
                    return (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          className="avatar"
                          style={{ background: color.bg, color: color.text, flexShrink: 0 }}
                        >
                          {getInitials(p?.name || '?')}
                        </div>
                        <span style={{ width: 90, fontSize: '0.875rem', fontWeight: 500 }}>
                          {p?.name}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>₹</span>
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.customShares[id] || ''}
                          onChange={(e) => setCustomShare(id, e.target.value)}
                          style={{ maxWidth: 120 }}
                        />
                        {errors[`share_${id}`] && (
                          <span className="form-error" style={{ fontSize: '0.75rem' }}>
                            ⚠ {errors[`share_${id}`]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {errors.customShares && (
                  <div className="form-error" style={{ marginBottom: 8 }}>
                    ⚠ {errors.customShares}
                  </div>
                )}

                <div
                  style={{
                    fontSize: '0.8rem',
                    color: customDiff === 0 ? 'var(--accent-light)' : 'var(--danger-light)',
                    padding: '6px 10px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Total allocated: <strong>₹{customTotal.toFixed(2)}</strong> of{' '}
                  <strong>₹{expenseAmt.toFixed(2)}</strong>
                  {customDiff !== 0 && (
                    <span style={{ marginLeft: 8 }}>
                      ({customDiff > 0 ? `₹${(customDiff / 100).toFixed(2)} unallocated` : `₹${(-customDiff / 100).toFixed(2)} over allocated`})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={participants.length < 2}
            >
              <PlusCircle size={15} />
              {editingExpense ? 'Save Changes' : 'Add Expense'}
            </button>
            {editingExpense && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
