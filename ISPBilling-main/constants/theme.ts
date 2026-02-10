export const colors = {
  // Base colors
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceLight: '#252525',
  border: '#333333',
  
  // Brand colors
  primary: '#00bcd4',
  primaryDark: '#0097a7',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',
  
  // Text colors
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  textMuted: '#757575',
  
  // Status colors
  online: '#4caf50',
  offline: '#f44336',
  idle: '#ff9800',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
  },
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: colors.text,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.text,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: colors.textMuted,
  },
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
};
