import * as React from "react";
import { BREAKPOINTS, Breakpoint } from "@/utils/responsive";

const MOBILE_BREAKPOINT = BREAKPOINTS.md; // 768px
const TABLET_BREAKPOINT = BREAKPOINTS.lg; // 1024px

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`);
    const onChange = () => {
      const width = window.innerWidth;
      setIsTablet(width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    const width = window.innerWidth;
    setIsTablet(width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isTablet;
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>('xs');

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.sm) setBreakpoint('xs');
      else if (width < BREAKPOINTS.md) setBreakpoint('sm');
      else if (width < BREAKPOINTS.lg) setBreakpoint('md');
      else if (width < BREAKPOINTS.xl) setBreakpoint('lg');
      else if (width < BREAKPOINTS['2xl']) setBreakpoint('xl');
      else if (width < BREAKPOINTS['3xl']) setBreakpoint('2xl');
      else if (width < BREAKPOINTS['4xl']) setBreakpoint('3xl');
      else setBreakpoint('4xl');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}
