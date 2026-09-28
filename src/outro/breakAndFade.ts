import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle } from '../core/motion';
import { splitChars } from '../core/split';

export interface BreakAndFadeOptions extends BaseOptions {
  /** Sweep duration across text in milliseconds. Defaults to 400. */
  sweepDuration?: number;
  /** Whether to keep text hidden or restore original state after completion. Defaults to false. */
  keep?: boolean;
}

/**
 * Break-and-fade sweep outro animation.
 * Sweeps a visible samurai slash streak across text, triggering a sharp fracture displacement and fade on each character.
 * NOTE: Single-line text only.
 */
export function breakAndFade(
  target: Target,
  options?: BreakAndFadeOptions
): AnimationHandle {
  const element = resolveElement(target);
  if (!element || prefersReducedMotion()) {
    if (element) element.style.opacity = '0';
    return createDummyHandle();
  }

  const {
    duration = 800,
    sweepDuration = 400,
    keep = false,
  } = options || {};

  const originalAriaLabel = element.getAttribute('aria-label');
  const text = element.textContent || '';

  if (!originalAriaLabel) {
    element.setAttribute('aria-label', text);
  }

  element.style.position = 'relative';

  const splitResult = splitChars(element);
  const chars = splitResult.chars;

  if (chars.length === 0) {
    return createDummyHandle();
  }

  // Samurai slash line element
  const slashLine = document.createElement('div');
  slashLine.style.position = 'absolute';
  slashLine.style.top = '-10px';
  slashLine.style.bottom = '-10px';
  slashLine.style.width = '3px';
  slashLine.style.backgroundColor = '#ffffff';
  slashLine.style.boxShadow = '0 0 12px #38bdf8, 0 0 22px #0284c7, 0 0 35px #0284c7';
  slashLine.style.transform = 'skewX(-25deg)';
  slashLine.style.zIndex = '50';
  slashLine.style.pointerEvents = 'none';
  element.appendChild(slashLine);

  const animations: Animation[] = [];

  if (typeof slashLine.animate === 'function') {
    const lineAnim = slashLine.animate(
      [
        { left: '-5%', opacity: 1 },
        { left: '105%', opacity: 0 },
      ],
      {
        duration: sweepDuration,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'forwards',
      }
    );
    animations.push(lineAnim);
  }

  const charStagger = chars.length > 1 ? sweepDuration / (chars.length - 1) : 0;

  chars.forEach((charEl, index) => {
    const slashShiftX = (index % 2 === 0 ? 1 : -1) * (14 + Math.random() * 8);
    const slashShiftY = (Math.random() - 0.5) * 12;
    const rotate = (index % 2 === 0 ? 1 : -1) * 22;

    if (typeof charEl.animate === 'function') {
      const anim = charEl.animate(
        [
          { opacity: 1, transform: 'translate3d(0, 0, 0) rotate(0deg)' },
          { opacity: 1, transform: `translate3d(${slashShiftX}px, ${slashShiftY}px, 0) rotate(${rotate}deg)`, offset: 0.3 },
          { opacity: 0, transform: `translate3d(${slashShiftX * 1.8}px, ${slashShiftY + 25}px, 0) rotate(${rotate * 1.5}deg)`, offset: 1 },
        ],
        {
          duration: duration - sweepDuration + 300,
          delay: index * charStagger,
          easing: 'cubic-bezier(0.2, 0, 0.8, 1)',
          fill: 'forwards',
        }
      );
      animations.push(anim);
    }
  });

  const revert = () => {
    if (slashLine.parentNode) {
      slashLine.parentNode.removeChild(slashLine);
    }
    splitResult.revert();
    element.style.position = '';
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
