export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DUR = {
  instant: 0.12, // 120ms
  fast: 0.2,     // 200ms
  base: 0.32,    // 320ms
  slow: 0.48,    // 480ms
} as const;

export const COLORS = {
  brand: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFD9FE',
    300: '#93BFFD',
    400: '#5E9CF9',
    500: '#3B82F6',
    600: '#1D6FE0',
    700: '#1857B4',
    800: '#164A93',
    900: '#163F79',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  semantic: {
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    emergency: '#B91C1C',
  },
} as const;
