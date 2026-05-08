export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

export type AppColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  text: string;
  muted: string;
  primary: string;
  primaryPressed: string;
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
  background: '#F3F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F9FE',
  surfaceRaised: '#EEF4FF',
  text: '#102033',
  muted: '#64748B',
  primary: '#2E6BFF',
  primaryPressed: '#1E4FD6',
  primaryText: '#FFFFFF',
  border: '#D7E0EE',
  accent: '#11B981',
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
  background: '#0D1420',
  surface: '#131D2D',
  surfaceAlt: '#182334',
  surfaceRaised: '#1B2940',
  text: '#F4F7FC',
  muted: '#A4B1C3',
  primary: '#82A8FF',
  primaryPressed: '#5B86F3',
  primaryText: '#08111F',
  border: '#243247',
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
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  md: 16,
  lg: 20,
  xl: 28,
};

export function getAppTheme(mode: ResolvedThemeMode): AppTheme {
  return {
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
  };
}
