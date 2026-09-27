import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle } from '../core/motion';

export interface StripRealignOptions extends BaseOptions {
  /** Number of horizontal strips to slice the text into. Defaults to 5. */
  strips?: number;
  /** Maximum initial horizontal offset in pixels. Defaults to 60. */
  maxOffset?: number;
  /** Number of discrete snap steps. Defaults to 3. */
  steps?: number;
}

/**
 * Strip realign intro animation.
 * Slices text into horizontal strips that start misaligned and snap into alignment in fast discrete moves.
 */
export function stripRealign(
  target: Target,
  options?: StripRealignOptions
): AnimationHandle {
  const element = resolveElement(target);
  if (!element) {
    return createDummyHandle();
  }

  if (prefersReducedMotion()) {
    return createDummyHandle();
  }

  const {
    strips = 5,
    maxOffset = 60,
    steps = 3,
    duration = 400,
  } = options || {};

  const originalHTML = element.innerHTML;
  const originalAriaLabel = element.getAttribute('aria-label');
  const text = element.textContent || '';

  if (!originalAriaLabel) {
    element.setAttribute('aria-label', text);
  }

  const rect = element.getBoundingClientRect();
  const height = rect.height || 40;
  const stripHeight = height / strips;

  element.style.position = 'relative';
  element.style.height = `${height}px`;
  element.style.overflow = 'hidden';
  element.textContent = '';

  const stripElements: HTMLElement[] = [];
  const animations: Animation[] = [];

  for (let i = 0; i < strips; i++) {
    const stripWrapper = document.createElement('div');
    stripWrapper.style.position = 'absolute';
    stripWrapper.style.top = `${i * stripHeight}px`;
    stripWrapper.style.left = '0';
    stripWrapper.style.right = '0';
    stripWrapper.style.height = `${stripHeight}px`;
    stripWrapper.style.overflow = 'hidden';
    stripWrapper.setAttribute('aria-hidden', 'true');

    const innerContent = document.createElement('div');
    innerContent.style.position = 'absolute';
    innerContent.style.top = `-${i * stripHeight}px`;
    innerContent.style.left = '0';
    innerContent.style.right = '0';
    innerContent.innerHTML = originalHTML;

    stripWrapper.appendChild(innerContent);
    element.appendChild(stripWrapper);
    stripElements.push(stripWrapper);

    const initialOffsetX = (i % 2 === 0 ? 1 : -1) * (maxOffset * (0.6 + Math.random() * 0.4));
    stripWrapper.style.transform = `translate3d(${initialOffsetX}px, 0, 0)`;

    if (typeof stripWrapper.animate === 'function') {
      const keyframes: Keyframe[] = [{ transform: `translate3d(${initialOffsetX}px, 0, 0)` }];
      for (let s = 1; s < steps; s++) {
        const stepRatio = 1 - s / steps;
        const stepOffset = initialOffsetX * stepRatio;
        keyframes.push({ transform: `translate3d(${stepOffset.toFixed(1)}px, 0, 0)` });
      }
      keyframes.push({ transform: 'translate3d(0, 0, 0)' });

      const anim = stripWrapper.animate(keyframes, {
        duration,
        delay: i * 30,
        easing: `steps(${steps}, end)`,
        fill: 'forwards',
      });
      animations.push(anim);
    }
  }

  const revert = () => {
    element.innerHTML = originalHTML;
    element.style.position = '';
    element.style.height = '';
    element.style.overflow = '';
    if (originalAriaLabel === null) {
      element.removeAttribute('aria-label');
    } else {
      element.setAttribute('aria-label', originalAriaLabel);
    }
  };

  const finished = Promise.all(animations.map((a) => a.finished)).then(() => {
    revert();
  });

  const cancel = () => {
    animations.forEach((a) => a.cancel());
    revert();
  };

  return { finished, cancel };
}
