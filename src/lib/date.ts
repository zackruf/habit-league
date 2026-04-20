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

export function getPreviousWeekKeys() {
  const start = getStartOfWeek(new Date());
  start.setDate(start.getDate() - 7);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatFriendlyDate(date, 'key');
  });
}

export function getWeekUrgencyMessage(date: Date = new Date()) {
  const day = date.getDay();

  if (day === 6) {
    return {
      title: 'Final push',
      message: 'One day left to move up before the week resets.',
    };
  }

  if (day === 0) {
    return {
      title: 'Reset starts tomorrow',
      message: 'Check in today, then everyone gets a fresh leaderboard on Monday.',
    };
  }

  if (day === 1) {
    return {
      title: 'Fresh week',
      message: 'A clean leaderboard is live. Early check-ins set the pace.',
    };
  }

  return null;
}

function getStartOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  next.setHours(0, 0, 0, 0);
  return next;
}
