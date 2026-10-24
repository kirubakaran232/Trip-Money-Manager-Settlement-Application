import { useState, useEffect, useCallback } from 'react';
import './index.css';
import { api } from './services/api.js';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Participants from './components/Participants';
import AddExpense from './components/AddExpense';
import ExpenseHistory from './components/ExpenseHistory';
import Settlement from './components/Settlement';
import Toast from './components/Toast';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Server state ──────────────────────────────────────────
  const [participants, setParticipants] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [completedTransfers, setCompletedTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  const [toasts, setToasts] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);

  // ── Toast helper ──────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // ── Normalize MongoDB _id → id for engine compatibility ───
  const normalizeParticipant = (p) => ({ id: p._id || p.id, name: p.name });
  const normalizeExpense = (e) => ({
    id: e._id || e.id,
    title: e.title,
    amount: e.amount,
    category: e.category,
    payerId: e.payerId,
    splitMethod: e.splitMethod,
    splits: (e.splits || []).map((s) => ({
      participantId: s.participantId,
      share: s.share,
    })),
    createdAt: e.createdAt,
  });

  // ── Initial data load ─────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setDbError(null);
      const [parts, exps, transfers] = await Promise.all([
        api.getParticipants(),
        api.getExpenses(),
        api.getCompletedTransfers(),
      ]);
      setParticipants(parts.map(normalizeParticipant));
      setExpenses(exps.map(normalizeExpense));
      setCompletedTransfers(transfers);
    } catch (err) {
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Participants ──────────────────────────────────────────
  const addParticipant = async (name) => {
    try {
      const p = await api.addParticipant(name);
      setParticipants((prev) => [...prev, normalizeParticipant(p)]);
      showToast(`${p.name} added!`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const removeParticipant = async (id) => {
    try {
      await api.removeParticipant(id);
      setParticipants((prev) => prev.filter((p) => p.id !== id));
      showToast('Participant removed');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ── Expenses ──────────────────────────────────────────────
  const addExpense = async (expense) => {
    try {
      const created = await api.addExpense(expense);
      setExpenses((prev) => [...prev, normalizeExpense(created)]);
      // Server auto-clears completed transfers when expense changes
      setCompletedTransfers([]);
      showToast('Expense added!');
      setActiveTab('history');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const updateExpense = async (updated) => {
    try {
      const saved = await api.updateExpense(updated.id, updated);
      setExpenses((prev) => prev.map((e) => (e.id === updated.id ? normalizeExpense(saved) : e)));
      setCompletedTransfers([]);
      setEditingExpense(null);
      showToast('Expense updated!');
      setActiveTab('history');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const deleteExpense = async (id) => {
    try {
      await api.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      setCompletedTransfers([]);
      showToast('Expense deleted');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ── Settlement ────────────────────────────────────────────
  const markTransferComplete = async (transferKey) => {
    try {
      await api.markTransferComplete(transferKey);
      setCompletedTransfers((prev) => [...prev, transferKey]);
      showToast('Transfer marked complete ✓');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ── Reset demo ────────────────────────────────────────────
  const resetToDemo = async () => {
    try {
      await api.resetToDemo();
      await loadAll();
      setEditingExpense(null);
      setActiveTab('dashboard');
      showToast('Demo data restored!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setActiveTab('add-expense');
  };

  const sharedProps = {
    participants,
    expenses,
    completedTransfers,
    showToast,
    setActiveTab,
    addParticipant,
    removeParticipant,
    addExpense,
    updateExpense,
    deleteExpense,
    markTransferComplete,
    editingExpense,
    setEditingExpense,
    handleEditExpense,
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':   return <Dashboard {...sharedProps} />;
      case 'participants': return <Participants {...sharedProps} />;
      case 'add-expense': return <AddExpense {...sharedProps} />;
      case 'history':     return <ExpenseHistory {...sharedProps} />;
      case 'settlement':  return <Settlement {...sharedProps} />;
      default:            return <Dashboard {...sharedProps} />;
    }
  };

  // ── Loading screen ────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        gap: 16,
      }}>
        <div style={{ fontSize: '2.5rem' }}>✈</div>
        <div style={{ color: 'var(--accent-light)', fontWeight: 700, fontSize: '1.1rem' }}>
          TripSettle
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Connecting to MongoDB…
        </div>
        <div style={{
          width: 200,
          height: 3,
          background: 'var(--border)',
          borderRadius: 2,
          overflow: 'hidden',
          marginTop: 8,
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--accent-dark), var(--accent-light))',
            borderRadius: 2,
            animation: 'pulse 1.2s ease-in-out infinite',
            width: '60%',
          }} />
        </div>
        <style>{`
          @keyframes pulse {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    );
  }

  // ── DB error screen ───────────────────────────────────────
  if (dbError) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        gap: 16,
        padding: 32,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <div style={{ color: 'var(--danger-light)', fontWeight: 700, fontSize: '1.2rem' }}>
          Cannot connect to MongoDB
        </div>
        <div style={{
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
          maxWidth: 400,
          lineHeight: 1.6,
        }}>
          {dbError}
          <br /><br />
          Make sure MongoDB is running on <code style={{ color: 'var(--accent)' }}>localhost:27017</code>
          {' '}and the Express API server is started.
        </div>
        <button
          className="btn btn-primary"
          onClick={loadAll}
          style={{ marginTop: 8 }}
        >
          ↩ Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <button className="mobile-nav-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }}
        sidebarOpen={sidebarOpen}
        expenseCount={expenses.length}
        participantCount={participants.length}
      />

      <main className="main-content">
        <div className="fade-in" key={activeTab}>
          {renderTab()}
        </div>
      </main>

      <Toast toasts={toasts} />
    </div>
  );
}
