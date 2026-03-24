export function formatFriendlyDate(date: Date, mode: 'label' | 'key' = 'label') {
  if (mode === 'key') {
    return date.toISOString().slice(0, 10);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getCurrentWeekLabel() {
  const now = new Date();
  const start = getStartOfWeek(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${formatFriendlyDate(start)} - ${formatFriendlyDate(end)}`;
}

export function getCurrentWeekKeys() {
  const start = getStartOfWeek(new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatFriendlyDate(date, 'key');
  });
}

function getStartOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  next.setHours(0, 0, 0, 0);
  return next;
}
