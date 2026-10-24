const AVATAR_COLORS = [
  { bg: '#10b981', text: '#000' },
  { bg: '#6366f1', text: '#fff' },
  { bg: '#f59e0b', text: '#000' },
  { bg: '#f43f5e', text: '#fff' },
  { bg: '#8b5cf6', text: '#fff' },
  { bg: '#06b6d4', text: '#000' },
  { bg: '#ec4899', text: '#fff' },
  { bg: '#84cc16', text: '#000' },
];

export function getAvatarColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getParticipantIndex(participants, id) {
  return participants.findIndex((p) => p.id === id);
}

export const CATEGORIES = ['Travel', 'Food', 'Accommodation', 'Tickets', 'Other'];

export function getCategoryClass(cat) {
  const map = {
    Travel: 'cat-travel',
    Food: 'cat-food',
    Accommodation: 'cat-accom',
    Tickets: 'cat-tickets',
    Other: 'cat-other',
  };
  return map[cat] || 'cat-other';
}

export function getCategoryEmoji(cat) {
  const map = {
    Travel: '✈️',
    Food: '🍽️',
    Accommodation: '🏨',
    Tickets: '🎟️',
    Other: '📦',
  };
  return map[cat] || '📦';
}

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export function generateTransferKey(t) {
  return `${t.fromId}__${t.toId}__${t.amount}`;
}
