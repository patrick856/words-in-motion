import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle } from '../core/motion';

export interface PaperCutOptions extends BaseOptions {
  /** Number of horizontal paper cut strips. Defaults to 5. */
  strips?: number;
  /** Direction of sweeping cut motion. Defaults to 'left-to-right'. */
  direction?: 'left-to-right' | 'right-to-left' | 'alternating';
  /** Order in which strips detach. Defaults to 'top-to-bottom'. */
  order?: 'top-to-bottom' | 'middle-outward' | 'bottom-to-top';
  /** Whether to keep text hidden or restore original state after completion. Defaults to false. */
  keep?: boolean;
}

/**
 * Paper cut outro animation.
 * Slices text into horizontal strips that cut and detach/fall off-screen in sequence.
 */
export function paperCut(
  target: Target,
  options?: PaperCutOptions
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
    strips = 5,
    direction = 'left-to-right',
    order = 'top-to-bottom',
    duration = 600,
    keep = false,
  } = options || {};

  const originalHTML = element.innerHTML;
  const originalAriaLabel = element.getAttribute('aria-label');
  const text = element.textContent || '';

  if (!originalAriaLabel) {
    element.setAttribute('aria-label', text);
  }

  const rect = element.getBoundingClientRect();
  const height = rect.height || 40;
  const width = rect.width || 300;
  const stripHeight = height / strips;

  element.style.position = 'relative';
  element.style.height = `${height}px`;
  element.style.overflow = 'hidden';
  element.textContent = '';

  const stripWrappers: HTMLElement[] = [];
  const animations: Animation[] = [];

  const orderIndices: number[] = Array.from({ length: strips }, (_, i) => i);
  if (order === 'bottom-to-top') {
    orderIndices.reverse();
  } else if (order === 'middle-outward') {
    const mid = Math.floor(strips / 2);
    orderIndices.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
  }

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
    stripWrappers[i] = stripWrapper;
  }

  orderIndices.forEach((stripIdx, sequenceIdx) => {
    const stripWrapper = stripWrappers[stripIdx];
    let isRight = direction === 'left-to-right';
    if (direction === 'right-to-left') {
      isRight = false;
    } else if (direction === 'alternating') {
      isRight = sequenceIdx % 2 === 0;
    }

    const fallX = isRight ? width * 0.8 : -width * 0.8;
    const fallY = 40 + Math.random() * 30;
    const rotate = (isRight ? 1 : -1) * (15 + Math.random() * 20);

    if (typeof stripWrapper.animate === 'function') {
      const anim = stripWrapper.animate(
        [
          { opacity: 1, transform: 'translate3d(0, 0, 0) rotate(0deg)' },
          { opacity: 0, transform: `translate3d(${fallX}px, ${fallY}px, 0) rotate(${rotate}deg)` },
        ],
        {
          duration,
          delay: sequenceIdx * 80,
          easing: 'cubic-bezier(0.5, 0, 0.75, 0)',
          fill: 'forwards',
        }
      );
      animations.push(anim);
    } else {
      stripWrapper.style.opacity = '0';
    }
  });

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
    if (!keep) {
      element.style.opacity = '0';
    }
    revert();
  });

  const cancel = () => {
    animations.forEach((a) => a.cancel());
    revert();
    element.style.opacity = '';
  };

  return { finished, cancel };
}
