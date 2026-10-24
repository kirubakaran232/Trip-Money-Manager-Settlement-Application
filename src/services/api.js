/**
 * API service — all fetch calls to the Express/MongoDB backend.
 * All functions return the parsed JSON or throw an Error with a message.
 */

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Participants ──────────────────────────────────────────────

export const api = {
  // Participants
  getParticipants: () => request('/participants'),
  addParticipant: (name) =>
    request('/participants', { method: 'POST', body: JSON.stringify({ name }) }),
  removeParticipant: (id) => request(`/participants/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: () => request('/expenses'),
  addExpense: (expense) =>
    request('/expenses', { method: 'POST', body: JSON.stringify(expense) }),
  updateExpense: (id, expense) =>
    request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(expense) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  // Completed transfers
  getCompletedTransfers: () => request('/transfers'),
  markTransferComplete: (transferKey) =>
    request('/transfers', { method: 'POST', body: JSON.stringify({ transferKey }) }),

  // Reset to demo
  resetToDemo: () => request('/reset', { method: 'POST' }),

  // Health
  health: () => request('/health'),
};
