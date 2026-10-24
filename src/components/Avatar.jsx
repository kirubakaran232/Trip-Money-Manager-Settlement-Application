import { getAvatarColor, getInitials, getParticipantIndex } from '../utils/helpers';

export default function Avatar({ name, participants, size = 'default', style = {} }) {
  const index = participants ? getParticipantIndex(participants, null, name) : 0;
  const idx = participants
    ? participants.findIndex((p) => p.name === name || p.id === name)
    : 0;
  const color = getAvatarColor(idx >= 0 ? idx : 0);
  const initials = getInitials(name || '?');

  const sizeClass = size === 'lg' ? 'avatar avatar-lg' : size === 'xl' ? 'avatar avatar-xl' : 'avatar';

  return (
    <div
      className={sizeClass}
      style={{ background: color.bg, color: color.text, ...style }}
      title={name}
    >
      {initials}
    </div>
  );
}
