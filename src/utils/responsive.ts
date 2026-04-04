/**
 * Responsive Design Utilities
 * Profesyonel responsive tasarım için yardımcı fonksiyonlar ve constants
 */

// Breakpoint Definitions (Tailwind CSS ile uyumlu)
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Touch Target Minimum Sizes (Apple HIG & Material Design)
export const TOUCH_TARGETS = {
  minimum: 44, // Apple HIG minimum
  comfortable: 48, // Material Design comfortable
  large: 56, // Large touch targets
} as const;

// Spacing Scale (Mobile-first, responsive)
export const SPACING = {
  xs: { base: '0.5rem', sm: '0.75rem' }, // 8px / 12px
  sm: { base: '0.75rem', sm: '1rem' }, // 12px / 16px
  md: { base: '1rem', sm: '1.5rem' }, // 16px / 24px
  lg: { base: '1.5rem', sm: '2rem' }, // 24px / 32px
  xl: { base: '2rem', sm: '3rem' }, // 32px / 48px
} as const;

// Typography Scale (Mobile-first)
export const TYPOGRAPHY = {
  xs: { base: '0.75rem', sm: '0.8125rem' }, // 12px / 13px
  sm: { base: '0.8125rem', sm: '0.875rem' }, // 13px / 14px
  base: { base: '0.875rem', sm: '1rem' }, // 14px / 16px
  lg: { base: '1rem', sm: '1.125rem' }, // 16px / 18px
  xl: { base: '1.125rem', sm: '1.25rem' }, // 18px / 20px
  '2xl': { base: '1.25rem', sm: '1.5rem' }, // 20px / 24px
  '3xl': { base: '1.5rem', sm: '1.875rem' }, // 24px / 30px
  '4xl': { base: '1.875rem', sm: '2.25rem' }, // 30px / 36px
} as const;

/**
 * Check if current viewport is mobile
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < BREAKPOINTS.md;
};

/**
 * Check if current viewport is tablet
 */
export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS.md && window.innerWidth < BREAKPOINTS.lg;
};

/**
 * Check if current viewport is desktop
 */
export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS.lg;
};

/**
 * Get responsive class names for spacing
 */
export const getSpacingClasses = (size: keyof typeof SPACING) => {
  return `p-${SPACING[size].base.replace('rem', '')} sm:p-${SPACING[size].sm.replace('rem', '')}`;
};

/**
 * Get responsive class names for typography
 */
export const getTypographyClasses = (size: keyof typeof TYPOGRAPHY) => {
  const base = TYPOGRAPHY[size].base.replace('rem', '');
  const sm = TYPOGRAPHY[size].sm.replace('rem', '');
  return `text-[${base}] sm:text-[${sm}]`;
};

/**
 * Get touch target classes
 */
export const getTouchTargetClasses = (size: 'minimum' | 'comfortable' | 'large' = 'minimum') => {
  const height = TOUCH_TARGETS[size];
  return `min-h-[${height}px] min-w-[${height}px]`;
};

/**
 * Responsive grid columns
 */
export const getGridColumns = (cols: { base: number; sm?: number; md?: number; lg?: number }) => {
  const classes = [`grid-cols-${cols.base}`];
  if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
  if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
  if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
  return classes.join(' ');
};

/**
 * Common responsive patterns
 */
export const RESPONSIVE_PATTERNS = {
  // Container padding
  containerPadding: 'p-3 sm:p-4 md:p-6',
  // Card padding
  cardPadding: 'p-4 sm:p-5 md:p-6',
  // Section spacing
  sectionSpacing: 'space-y-4 sm:space-y-6 md:space-y-8',
  // Grid gap
  gridGap: 'gap-3 sm:gap-4 md:gap-6',
  // Button size
  buttonSize: 'h-11 sm:h-10 px-4 sm:px-3',
  // Input size
  inputSize: 'h-11 sm:h-10 px-4 sm:px-3',
  // Text size
  heading1: 'text-2xl sm:text-3xl md:text-4xl',
  heading2: 'text-xl sm:text-2xl md:text-3xl',
  heading3: 'text-lg sm:text-xl md:text-2xl',
  body: 'text-sm sm:text-base',
  small: 'text-xs sm:text-sm',
} as const;

