import { LayoutDashboard, Users, PlusCircle, List, ArrowLeftRight } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'participants', label: 'Participants', icon: Users },
  { id: 'add-expense', label: 'Add Expense', icon: PlusCircle },
  { id: 'history', label: 'Expense History', icon: List },
  { id: 'settlement', label: 'Settle Up (GPay)', icon: ArrowLeftRight },
];

export default function Sidebar({ activeTab, setActiveTab, sidebarOpen, expenseCount, participantCount }) {
  return (
    <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">✈</div>
          <div className="logo-text">
            <h1>TripSettle</h1>
            <span>Smart Settlement</span>
          </div>
        </div>
      </div>

      <div className="nav-menu">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} className="nav-icon" />
            <span>{label}</span>
            {id === 'history' && expenseCount > 0 && (
              <span className="nav-badge">{expenseCount}</span>
            )}
            {id === 'participants' && participantCount > 0 && (
              <span className="nav-badge">{participantCount}</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
