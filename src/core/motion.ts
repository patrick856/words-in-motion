import type { AnimationHandle, Target } from './types';

/**
 * Checks if the user has requested reduced motion via system/browser preferences.
 * Safe to call in SSR environments (returns false on server).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Resolves a Target parameter (CSS selector or HTMLElement) to a DOM HTMLElement.
 * Returns null if not running in a browser environment or element is not found.
 */
export function resolveElement(target: Target): HTMLElement | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  if (typeof target === 'string') {
    return document.querySelector<HTMLElement>(target);
  }
  if (target instanceof HTMLElement) {
    return target;
  }
  return null;
}

/**
 * Creates a no-op animation handle for reduced-motion or missing element scenarios.
 */
export function createDummyHandle(): AnimationHandle {
  return {
    finished: Promise.resolve(),
    cancel: () => {},
  };
}
