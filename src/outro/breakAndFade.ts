import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle } from '../core/motion';
import { splitChars } from '../core/split';

export interface BreakAndFadeOptions extends BaseOptions {
  /** Sweep duration across text in milliseconds. Defaults to 500. */
  sweepDuration?: number;
  /** Whether to keep text hidden or restore original state after completion. Defaults to false. */
  keep?: boolean;
}

/**
 * Break-and-fade sweep outro animation.
 * Sweeps a marker line across text, triggering a fracture/glitch transform followed by a fade on each character.
 * NOTE: Single-line text only.
 */
export function breakAndFade(
  target: Target,
  options?: BreakAndFadeOptions
): AnimationHandle {
  const element = resolveElement(target);
  if (!element) {
    return createDummyHandle();
  }

  if (prefersReducedMotion()) {
    element.style.opacity = '0';
    return createDummyHandle();
  }

  const {
    duration = 800,
    sweepDuration = 500,
    keep = false,
  } = options || {};

  const splitResult = splitChars(element);
  const chars = splitResult.chars;

  if (chars.length === 0) {
    return createDummyHandle();
  }

  const animations: Animation[] = [];
  const charStagger = chars.length > 1 ? sweepDuration / (chars.length - 1) : 0;

  chars.forEach((charEl, index) => {
    const glitchX = (Math.random() - 0.5) * 16;
    const glitchY = (Math.random() - 0.5) * 12;
    const glitchRotate = (Math.random() - 0.5) * 25;

    if (typeof charEl.animate === 'function') {
      const anim = charEl.animate(
        [
          { opacity: 1, transform: 'translate3d(0, 0, 0) rotate(0deg)' },
          { opacity: 0.9, transform: `translate3d(${glitchX}px, ${glitchY}px, 0) rotate(${glitchRotate}deg)` },
          { opacity: 0, transform: `translate3d(${glitchX * 1.5}px, ${glitchY + 15}px, 0) rotate(${glitchRotate * 1.5}deg)` },
        ],
        {
          duration: duration - sweepDuration + 300,
          delay: index * charStagger,
          easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
          fill: 'forwards',
        }
      );
      animations.push(anim);
    } else {
      charEl.style.opacity = '0';
    }
  });

  const finished = Promise.all(animations.map((a) => a.finished)).then(() => {
    if (!keep) {
      element.style.opacity = '0';
      splitResult.revert();
    }
  });

  const cancel = () => {
    animations.forEach((a) => a.cancel());
    splitResult.revert();
    element.style.opacity = '';
  };

  return { finished, cancel };
}
