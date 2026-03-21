// Space Theme Design System
export const Colors = {
  background: '#050510',
  card: 'rgba(0, 10, 40, 0.85)',
  neonBlue: '#00d4ff',
  neonPurple: '#9b5de5',
  neonGreen: '#00ff88',
  neonRed: '#ff3366',
  neonYellow: '#ffe600',
  textPrimary: '#e8f4ff',
  textSecondary: '#7ab3cc',
  textMuted: '#3a6b8a',
  border: 'rgba(0, 212, 255, 0.3)',
  borderGlow: 'rgba(0, 212, 255, 0.6)',
  success: '#00ff88',
  danger: '#ff3366',
  warning: '#ffe600',
};

export const Shadows = {
  glow: (color = Colors.neonBlue, radius = 15) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: radius,
    elevation: 12,
  }),
  card: {
    shadowColor: Colors.neonBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const Typography = {
  heading: {
    fontFamily: 'Orbitron_700Bold',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  subheading: {
    fontFamily: 'Orbitron_600SemiBold',
    color: Colors.neonBlue,
    letterSpacing: 1.5,
  },
  body: {
    fontFamily: 'Orbitron_400Regular',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  caption: {
    fontFamily: 'Orbitron_400Regular',
    color: Colors.textMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
