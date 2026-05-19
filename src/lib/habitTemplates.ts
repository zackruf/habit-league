export type HabitTemplate = {
  id: string;
  title: string;
  emoji: string;
  category: string;
  description: string;
};

export const HABIT_TEMPLATES: HabitTemplate[] = [
  {
    id: 'weekend-18',
    title: 'Weekend 18',
    emoji: '18',
    category: 'Weekend round',
    description: 'A clean starter format for groups that play one competitive round each weekend.',
  },
  {
    id: 'after-work-9',
    title: 'After-work 9',
    emoji: '9',
    category: 'Quick round',
    description: 'Perfect for smaller groups chasing one fast round during the week.',
  },
  {
    id: 'stroke-battle',
    title: 'Stroke battle',
    emoji: 'S',
    category: 'Stroke play',
    description: 'Track straight-up scores and keep the leaderboard brutally simple.',
  },
  {
    id: 'scramble-night',
    title: 'Scramble night',
    emoji: '2v2',
    category: 'Scramble',
    description: 'A lighter team format that keeps the group social and competitive.',
  },
  {
    id: 'personal-best-push',
    title: 'Personal best push',
    emoji: 'PB',
    category: 'Improvement',
    description: 'Build a group around chasing lower scores on the same course over time.',
  },
];

export function getDefaultHabitTemplate() {
  return HABIT_TEMPLATES[0];
}
