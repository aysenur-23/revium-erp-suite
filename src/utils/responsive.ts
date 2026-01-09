/**
 * Responsive Design Utilities
 * Profesyonel responsive tasarım için yardımcı fonksiyonlar ve constants
 */

// Breakpoint Definitions (Tailwind CSS ile uyumlu)
export const BREAKPOINTS = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
  '4xl': 2560,
} as const;

// Breakpoint type for TypeScript
export type Breakpoint = keyof typeof BREAKPOINTS;

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
 * Check if current viewport is mobile (< 768px)
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < BREAKPOINTS.md;
};

/**
 * Check if current viewport is tablet (768px - 1023px)
 */
export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS.md && window.innerWidth < BREAKPOINTS.lg;
};

/**
 * Check if current viewport is desktop (>= 1024px)
 */
export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS.lg;
};

/**
 * Check if current viewport matches a specific breakpoint
 */
export const matchesBreakpoint = (breakpoint: Breakpoint): boolean => {
  if (typeof window === 'undefined') return false;
  const width = window.innerWidth;
  
  switch (breakpoint) {
    case 'xs':
      return width < BREAKPOINTS.sm;
    case 'sm':
      return width >= BREAKPOINTS.sm && width < BREAKPOINTS.md;
    case 'md':
      return width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
    case 'lg':
      return width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl;
    case 'xl':
      return width >= BREAKPOINTS.xl && width < BREAKPOINTS['2xl'];
    case '2xl':
      return width >= BREAKPOINTS['2xl'] && width < BREAKPOINTS['3xl'];
    case '3xl':
      return width >= BREAKPOINTS['3xl'] && width < BREAKPOINTS['4xl'];
    case '4xl':
      return width >= BREAKPOINTS['4xl'];
    default:
      return false;
  }
};

/**
 * Get current breakpoint name
 */
export const getCurrentBreakpoint = (): Breakpoint => {
  if (typeof window === 'undefined') return 'xs';
  const width = window.innerWidth;
  
  if (width < BREAKPOINTS.sm) return 'xs';
  if (width < BREAKPOINTS.md) return 'sm';
  if (width < BREAKPOINTS.lg) return 'md';
  if (width < BREAKPOINTS.xl) return 'lg';
  if (width < BREAKPOINTS['2xl']) return 'xl';
  if (width < BREAKPOINTS['3xl']) return '2xl';
  if (width < BREAKPOINTS['4xl']) return '3xl';
  return '4xl';
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
  containerPadding: 'p-3 sm:p-4 md:p-5',
  // Card padding
  cardPadding: 'p-3 sm:p-4 md:p-5',
  // Section spacing
  sectionSpacing: 'space-y-3 sm:space-y-4',
  // Grid gap
  gridGap: 'gap-2.5 sm:gap-3',
  // Button size
  buttonSize: 'h-11 sm:h-10 px-3 sm:px-3',
  // Input size
  inputSize: 'h-11 sm:h-10 px-3 sm:px-3',
  // Text size
  heading1: 'text-2xl sm:text-3xl md:text-4xl',
  heading2: 'text-xl sm:text-2xl md:text-3xl',
  heading3: 'text-lg sm:text-xl md:text-2xl',
  body: 'text-sm sm:text-base',
  small: 'text-xs sm:text-sm',
} as const;

