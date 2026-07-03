export const colors = {
  bg: '#0B0F14',
  bgElevated: '#131A22',
  bgCard: '#182029',
  border: '#232C36',
  text: '#F5F7FA',
  textMuted: '#8A97A6',
  textSubtle: '#5A6572',
  primary: '#2FBF71',
  primaryDim: '#1F8A50',
  danger: '#E5484D',
  warning: '#F5A524',
  accent: '#3D8BFD',
  chipRed: '#D64545',
  chipGreen: '#2FBF71',
  chipBlack: '#111418',
  overlay: 'rgba(0,0,0,0.55)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 30, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.text },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
  small: { fontSize: 13, fontWeight: '400' as const, color: colors.textMuted },
  tiny: { fontSize: 11, fontWeight: '500' as const, color: colors.textSubtle },
};
