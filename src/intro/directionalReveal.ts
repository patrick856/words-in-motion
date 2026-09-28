import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle, registerIntro, unregisterIntro } from '../core/motion';
import { splitChars, splitWords } from '../core/split';

export interface DirectionalRevealOptions extends BaseOptions {
  /** Reveal direction ordering across elements. Defaults to 'left-to-right'. */
  direction?: 'left-to-right' | 'right-to-left' | 'center-out' | 'edges-in';
  /** Split granularity. Defaults to 'chars'. */
  by?: 'chars' | 'words';
  /** Whether elements drop in vertically from above as they reveal. Defaults to false. */
  dropIn?: boolean;
  /** Vertical drop-in distance in pixels when dropIn is true. Defaults to 20. */
  dropDistance?: number;
  /** Style of drop reveal when dropIn is true. Defaults to 'settle-on-next'. */
  dropStyle?: 'settle-on-next' | 'simple';
  /** Settle duration for 'settle-on-next' mode. Defaults to 260. */
  settleDuration?: number;
}

/**
 * Directional reveal intro animation.
 * Reveals text word-by-word or char-by-char sliding in directionally or dropping from above.
 */
export function directionalReveal(target: Target, options?: DirectionalRevealOptions): AnimationHandle {
  const element = resolveElement(target);
  if (!element) return createDummyHandle();
  if (prefersReducedMotion()) return createDummyHandle();

  const {
    direction = 'left-to-right',
    by = 'chars',
    dropIn = false,
    dropDistance = 20,
    dropStyle = 'settle-on-next',
    settleDuration = 260,
    duration = 600,
    stagger = 40,
    easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
    revertOnFinish = true,
  } = options || {};

  const splitResult = by === 'words' ? splitWords(element) : splitChars(element);
  const units: HTMLElement[] = 'words' in splitResult ? splitResult.words : splitResult.chars;

  if (units.length === 0) {
    return createDummyHandle();
  }

  const count = units.length;
  let isCanceled = false;
  const animations = new Set<Animation>();
  const timeouts = new Set<ReturnType<typeof setTimeout>>();

  let resolveFinished!: () => void;
  const finished = new Promise<void>((res) => { resolveFinished = res; });

  const cancel = () => {
    isCanceled = true;
    animations.forEach(a => a.cancel());
    timeouts.forEach(t => clearTimeout(t));
    splitResult.revert();
    unregisterIntro(element);
    resolveFinished();
  };

  registerIntro(element, { cancel });

  let unitsDone = 0;
  let maxStaggerIndex = 0;

  const staggers = units.map((_, index) => {
    let staggerIndex = index;
    if (direction === 'right-to-left') staggerIndex = count - 1 - index;
    else if (direction === 'center-out') staggerIndex = Math.abs(index - (count - 1) / 2);
    else if (direction === 'edges-in') staggerIndex = (count - 1) / 2 - Math.abs(index - (count - 1) / 2);
    if (staggerIndex > maxStaggerIndex) maxStaggerIndex = staggerIndex;
    return staggerIndex;
  });

  const onUnitDone = () => {
    unitsDone++;
    if (unitsDone === count) {
      if (!isCanceled) {
        if (revertOnFinish) splitResult.revert();
        unregisterIntro(element);
        resolveFinished();
      }
    }
  };

  units.forEach((unit: HTMLElement, i: number) => {
    const staggerIndex = staggers[i];
    let hOffset = 0;
    if (direction === 'left-to-right') hOffset = -15;
    else if (direction === 'right-to-left') hOffset = 15;

    unit.style.opacity = '0';

    if (typeof unit.animate === 'function') {
      if (dropIn && dropStyle === 'settle-on-next') {
        const startTransform = `translate3d(${hOffset}px, -${dropDistance}px, 0)`;
        const midTransform = `translate3d(0, -${dropDistance}px, 0)`;
        const finalTransform = `translate3d(0, 0, 0)`;
        
        const delay = Math.max(0, staggerIndex * stagger);
        
        const t1 = setTimeout(() => {
          if (isCanceled) return;
          unit.style.opacity = '1';
          const a1 = unit.animate(
            [
              { opacity: 0, transform: startTransform },
              { opacity: 1, transform: midTransform }
            ],
            { duration: 150, easing, fill: 'forwards' }
          );
          animations.add(a1);
          a1.onfinish = () => animations.delete(a1);
        }, delay);
        timeouts.add(t1);

        const settleDelay = Math.max(0, (staggerIndex + 1) * stagger);
        const t2 = setTimeout(() => {
          if (isCanceled) return;
          const a2 = unit.animate(
            [
              { transform: midTransform },
              { transform: finalTransform }
            ],
            { duration: settleDuration, easing, fill: 'forwards' }
          );
          animations.add(a2);
          a2.onfinish = () => {
            animations.delete(a2);
            onUnitDone();
          };
        }, settleDelay);
        timeouts.add(t2);

      } else {
        const dropY = dropIn ? -dropDistance : 0;
        let startTransform = 'none';
        if (hOffset !== 0 || dropY !== 0) {
          startTransform = `translate3d(${hOffset}px, ${dropY}px, 0)`;
        }

        const anim = unit.animate(
          [
            { opacity: 0, transform: startTransform },
            { opacity: 1, transform: 'translate3d(0, 0, 0)' }
          ],
          { duration, delay: Math.max(0, staggerIndex * stagger), easing, fill: 'forwards' }
        );
        animations.add(anim);
        anim.onfinish = () => {
          animations.delete(anim);
          onUnitDone();
        };
      }
    } else {
      unit.style.opacity = '1';
      onUnitDone();
    }
  });

  return { finished, cancel };
}
