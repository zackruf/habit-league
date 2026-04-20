export type HabitTemplate = {
  id: string;
  title: string;
  emoji: string;
  category: string;
  description: string;
};

export const HABIT_TEMPLATES: HabitTemplate[] = [
  {
    id: 'morning-walk',
    title: 'Morning walk',
    emoji: 'W',
    category: 'Health',
    description: 'A low-friction daily win that works for almost everyone.',
  },
  {
    id: 'drink-water',
    title: 'Drink water',
    emoji: 'H2O',
    category: 'Wellness',
    description: 'Simple, visible, and easy to check in every day.',
  },
  {
    id: 'read-10-pages',
    title: 'Read 10 pages',
    emoji: 'R',
    category: 'Learning',
    description: 'Build momentum without turning reading into homework.',
  },
  {
    id: 'workout',
    title: 'Workout',
    emoji: 'Fit',
    category: 'Fitness',
    description: 'A classic competitive habit for leagues with real stakes.',
  },
  {
    id: 'no-snooze',
    title: 'No snooze',
    emoji: 'AM',
    category: 'Focus',
    description: 'Start the day with a tiny promise kept.',
  },
  {
    id: 'plan-tomorrow',
    title: 'Plan tomorrow',
    emoji: 'PM',
    category: 'Productivity',
    description: 'A quick evening reset that improves the next morning.',
  },
];

export function getDefaultHabitTemplate() {
  return HABIT_TEMPLATES[0];
}
