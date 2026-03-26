export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

export type AppColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  primary: string;
  primaryText: string;
  border: string;
  accent: string;
  danger: string;
  heroPrimary: string;
  heroAlt: string;
  heroWarm: string;
  noticeBackground: string;
  noticeBorder: string;
  noticeText: string;
  badgeBackground: string;
  badgeText: string;
  currentUserBackground: string;
  currentUserBorder: string;
  tabInactive: string;
  shadow: string;
};

export type AppTheme = {
  mode: ResolvedThemeMode;
  colors: AppColors;
};

const lightColors: AppColors = {
  background: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF3FF',
  text: '#102033',
  muted: '#617186',
  primary: '#246BFD',
  primaryText: '#FFFFFF',
  border: '#D8E2F0',
  accent: '#12B981',
  danger: '#B42318',
  heroPrimary: '#EAF1FF',
  heroAlt: '#EAF7F3',
  heroWarm: '#FFF2DE',
  noticeBackground: '#FFF6E8',
  noticeBorder: '#F0D2A4',
  noticeText: '#8A4B08',
  badgeBackground: '#EEF3FF',
  badgeText: '#246BFD',
  currentUserBackground: '#EFF4FF',
  currentUserBorder: '#BED1FF',
  tabInactive: '#8190A5',
  shadow: '#0F172A',
};

const darkColors: AppColors = {
  background: '#0D1522',
  surface: '#132033',
  surfaceAlt: '#1A2940',
  text: '#F3F7FD',
  muted: '#A2B0C2',
  primary: '#7BA2FF',
  primaryText: '#08111F',
  border: '#22324A',
  accent: '#37D6A3',
  danger: '#FF7A7A',
  heroPrimary: '#13284A',
  heroAlt: '#16322E',
  heroWarm: '#3B2B18',
  noticeBackground: '#2E2416',
  noticeBorder: '#6D5735',
  noticeText: '#FFD9A0',
  badgeBackground: '#1E3155',
  badgeText: '#A8C0FF',
  currentUserBackground: '#1A2C4C',
  currentUserBorder: '#355C9D',
  tabInactive: '#7F8EA3',
  shadow: '#000000',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
};

export const radius = {
  md: 14,
  lg: 24,
  xl: 32,
};

export function getAppTheme(mode: ResolvedThemeMode): AppTheme {
  return {
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
  };
}
