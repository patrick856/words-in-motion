import type { AnimationHandle, BaseOptions, Target } from './types';
import { subscribeScrollTrigger } from './scroll';

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
 * Resolves a Target parameter (CSS selector, HTMLElement, array, or NodeList) to an array of HTMLElements.
 * Returns empty array if not running in a browser environment or no elements match.
 */
export function resolveElements(target: Target): HTMLElement[] {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return [];
  }
  if (typeof target === 'string') {
    return Array.from(document.querySelectorAll<HTMLElement>(target));
  }
  if (target instanceof HTMLElement) {
    return [target];
  }
  if (Array.isArray(target)) {
    return target.filter((el): el is HTMLElement => el instanceof HTMLElement);
  }
  if (typeof NodeList !== 'undefined' && target instanceof NodeList) {
    return Array.from(target).filter((el): el is HTMLElement => el instanceof HTMLElement);
  }
  if (typeof HTMLCollection !== 'undefined' && target instanceof HTMLCollection) {
    return Array.from(target).filter((el): el is HTMLElement => el instanceof HTMLElement);
  }
  return [];
}

/**
 * Resolves a Target parameter to the first matching DOM HTMLElement.
 * Returns null if not running in a browser environment or element is not found.
 */
export function resolveElement(target: Target): HTMLElement | null {
  const elements = resolveElements(target);
  return elements[0] ?? null;
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

const activeIntros = new WeakMap<HTMLElement, { cancel: () => void }>();

export function registerIntro(element: HTMLElement, handle: { cancel: () => void }): void {
  const existing = activeIntros.get(element);
  if (existing) {
    existing.cancel();
  }
  activeIntros.set(element, handle);
}

export function unregisterIntro(element: HTMLElement): void {
  activeIntros.delete(element);
}

/**
 * Safely normalizes an optional animation duration in milliseconds.
 * Returns defaultVal if duration is undefined, <= 0, NaN, or non-finite.
 * Ensures a safe minimum duration of 10ms.
 */
export function normalizeDuration(duration: number | undefined, defaultVal: number): number {
  if (typeof duration !== 'number' || isNaN(duration) || !isFinite(duration) || duration <= 0) {
    return defaultVal;
  }
  return Math.max(10, duration);
}

/**
 * Executes an animation function on one or more target elements, supporting immediate execution
 * or scroll-triggered ('enter' | 'leave') execution with geometric position evaluation.
 */
export function runAnimationWithTrigger<O extends BaseOptions>(
  target: Target,
  options: O | undefined,
  runSingle: (element: HTMLElement, opts?: O) => AnimationHandle,
  category: 'intro' | 'outro' = 'intro'
): AnimationHandle {
  const elements = resolveElements(target);
  if (elements.length === 0) {
    return createDummyHandle();
  }

  const trigger = options?.trigger ?? 'immediate';

  // 1. Immediate mode (default)
  if (trigger === 'immediate') {
    if (elements.length === 1) {
      return runSingle(elements[0], options);
    }
    const handles = elements.map((el) => runSingle(el, options));
    return {
      finished: Promise.all(handles.map((h) => h.finished)).then(() => {}),
      cancel: () => handles.forEach((h) => h.cancel()),
    };
  }

  // 2. Triggered mode ('enter' | 'leave')
  if (prefersReducedMotion()) {
    return createDummyHandle();
  }

  let isCanceled = false;
  const activeHandles = new Map<HTMLElement, AnimationHandle>();
  const unsubs = new Map<HTMLElement, () => void>();

  // If trigger is 'enter' for intro animation, keep element pre-hidden so it doesn't flash before reaching trigger
  if (trigger === 'enter' && category === 'intro') {
    elements.forEach((el) => {
      el.style.opacity = '0';
    });
  }

  const finishedPromises = elements.map((element) => {
    return new Promise<void>((resolve) => {
      const defaultStart = trigger === 'leave' ? 'bottom 20%' : 'top 80%';
      const start = options?.start || defaultStart;
      const once = options?.once !== false;

      const unsub = subscribeScrollTrigger({
        element,
        trigger,
        start,
        once,
        onTrigger: () => {
          if (isCanceled) return;

          if (trigger === 'enter' && category === 'intro') {
            element.style.opacity = '';
          }

          const handle = runSingle(element, options);
          activeHandles.set(element, handle);
          handle.finished
            .then(() => {
              if (once) {
                resolve();
              }
            })
            .catch(() => {});
        },
        onReset: () => {
          if (isCanceled) return;
          const active = activeHandles.get(element);
          if (active) {
            active.cancel();
            activeHandles.delete(element);
          }
          if (trigger === 'enter' && category === 'intro') {
            element.style.opacity = '0';
          }
        },
      });

      unsubs.set(element, unsub);
    });
  });

  const cancel = () => {
    isCanceled = true;
    for (const unsub of unsubs.values()) {
      unsub();
    }
    unsubs.clear();
    for (const handle of activeHandles.values()) {
      handle.cancel();
    }
    activeHandles.clear();
    if (trigger === 'enter' && category === 'intro') {
      elements.forEach((el) => {
        el.style.opacity = '';
      });
    }
  };

  return {
    finished: Promise.all(finishedPromises).then(() => {}),
    cancel,
  };
}
