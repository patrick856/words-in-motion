import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { prefersReducedMotion, createDummyHandle, registerIntro, unregisterIntro, normalizeDuration, runAnimationWithTrigger } from '../core/motion';
import { splitChars, splitWords } from '../core/split';

export interface DirectionalRevealOptions extends BaseOptions {
  /**
   * Total target duration of the effect in milliseconds.
   * Internal stagger and settle timings scale proportionally unless explicitly overridden.
   * @default 900
   */
  duration?: number;
  /** @deprecated Reveal order is intentionally irregular. */
  direction?: 'left-to-right' | 'right-to-left' | 'center-out' | 'edges-in';
  /** Split granularity. Defaults to 'chars'. */
  by?: 'chars' | 'words';
  /** @deprecated Letters now choose a random incoming direction. */
  dropIn?: boolean;
  /** @deprecated Letters now choose a random incoming direction. */
  dropDistance?: number;
  /** @deprecated Letters now choose a random incoming direction. */
  dropStyle?: 'settle-on-next' | 'simple';
  /** @deprecated Letters settle directly in their final position. */
  settleDuration?: number;
}

const DEFAULT_DURATION = 900;
const DEFAULT_STAGGER = 40;
const JUMP_AHEAD_CHANCE = 0.2;
const RANDOM_REVEAL_CHANCE = 0.06;

function createRevealOrder(count: number): number[] {
  const unrevealed = new Set(Array.from({ length: count }, (_, index) => index));
  const order: number[] = [];
  let nextSequential = 0;

  while (unrevealed.size > 0) {
    while (!unrevealed.has(nextSequential) && nextSequential < count) nextSequential++;
    const jumpCandidates = Array.from({ length: 4 }, (_, offset) => nextSequential + 5 + offset)
      .filter((index) => unrevealed.has(index));
    const roll = Math.random();
    let selected = nextSequential;

    if (roll < RANDOM_REVEAL_CHANCE) {
      const candidates = Array.from(unrevealed);
      selected = candidates[Math.floor(Math.random() * candidates.length)];
    } else if (roll < RANDOM_REVEAL_CHANCE + JUMP_AHEAD_CHANCE && jumpCandidates.length > 0) {
      selected = jumpCandidates[Math.floor(Math.random() * jumpCandidates.length)];
    }

    unrevealed.delete(selected);
    order.push(selected);
    if (selected === nextSequential) nextSequential++;
  }

  return order;
}

function originalUnitRects(element: HTMLElement, by: 'char' | 'word'): DOMRect[] {
  const rects: DOMRect[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.parentElement?.closest('script, style, textarea, [aria-hidden="true"]')) continue;
    const tokens = node.data.matchAll(/\S+/gu);
    for (const match of tokens) {
      const word = match[0];
      const start = match.index;
      const parts = by === 'word'
        ? [word]
        : typeof Intl.Segmenter === 'function'
          ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word), (part) => part.segment)
          : Array.from(word);
      let offset = start;
      for (const part of parts) {
        const range = document.createRange();
        range.setStart(node, offset);
        offset += part.length;
        range.setEnd(node, offset);
        rects.push(range.getBoundingClientRect?.() ?? element.getBoundingClientRect());
      }
    }
  }
  return rects;
}

function createClippedFrames(units: HTMLElement[], rects: DOMRect[], overlay: HTMLElement): void {
  const overlayRect = overlay.getBoundingClientRect();
  units.forEach((unit, index) => {
    const rect = rects[index];
    const unitRect = unit.getBoundingClientRect();
    const frame = document.createElement('span');
    frame.classList.add('wim-directional-frame');
    frame.style.position = 'absolute';
    frame.style.overflow = 'hidden';
    frame.style.left = `${rect.left - overlayRect.left}px`;
    frame.style.top = `${rect.top - overlayRect.top}px`;
    frame.style.width = `${Math.max(rect.width, unitRect.width)}px`;
    frame.style.height = `${Math.max(rect.height, unitRect.height)}px`;

    unit.parentNode?.insertBefore(frame, unit);
    frame.appendChild(unit);
    unit.style.display = 'inline-block';
    unit.style.opacity = '1';
    const unitTextRange = document.createRange();
    unitTextRange.selectNodeContents(unit);
    const unitTextRect = unitTextRange.getBoundingClientRect?.() ?? frame.getBoundingClientRect();
    frame.style.left = `${rect.left - overlayRect.left + rect.left - unitTextRect.left}px`;
    frame.style.top = `${rect.top - overlayRect.top + rect.top - unitTextRect.top}px`;
  });
}

function randomStartTransform(): string {
  const direction = Math.floor(Math.random() * 4);
  if (direction === 0) return 'translate3d(-115%, 0, 0)';
  if (direction === 1) return 'translate3d(115%, 0, 0)';
  if (direction === 2) return 'translate3d(0, -115%, 0)';
  return 'translate3d(0, 115%, 0)';
}

function runSingleDirectionalReveal(element: HTMLElement, options?: DirectionalRevealOptions): AnimationHandle {
  if (prefersReducedMotion()) return createDummyHandle();

  const duration = normalizeDuration(options?.duration, DEFAULT_DURATION);
  const timingScale = duration / DEFAULT_DURATION;

  const { by = 'chars', easing = 'cubic-bezier(0.16, 1, 0.3, 1)', revertOnFinish = true } = options || {};

  const actualStagger = typeof options?.stagger === 'number'
    ? Math.max(0, options.stagger)
    : Math.max(5, Math.round(DEFAULT_STAGGER * timingScale));

  const actualUnitDuration = Math.max(50, Math.round(600 * timingScale));

  // Keep the untouched text in flow so its kerning and line breaks never change.
  // The animated copy is positioned over glyph ranges measured from that text.
  const originalChildren = Array.from(element.childNodes).map((node) => node.cloneNode(true));
  const overlay = document.createElement('span');
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.userSelect = 'none';
  overlay.style.textAlign = 'inherit';
  overlay.style.whiteSpace = 'inherit';
  overlay.append(...originalChildren);
  const originalPosition = element.style.position;
  const originalVisibility = element.style.visibility;
  if (window.getComputedStyle(element).position === 'static') element.style.position = 'relative';
  element.style.visibility = 'hidden';
  element.appendChild(overlay);
  overlay.style.visibility = 'visible';

  const splitResult = by === 'words' ? splitWords(overlay) : splitChars(overlay);
  overlay.setAttribute('aria-hidden', 'true');
  const rects = originalUnitRects(element, 'granularity' in splitResult ? splitResult.granularity : 'word');
  const units: HTMLElement[] = 'words' in splitResult ? splitResult.words : splitResult.chars;

  if (units.length === 0) {
    overlay.remove();
    element.style.position = originalPosition;
    element.style.visibility = originalVisibility;
    return createDummyHandle();
  }

  const count = units.length;
  let isCanceled = false;
  const animations = new Set<Animation>();

  let resolveFinished!: () => void;
  const finished = new Promise<void>((res) => { resolveFinished = res; });

  const cancel = () => {
    if (isCanceled) return;
    isCanceled = true;
    animations.forEach(a => a.cancel());
    splitResult.revert();
    overlay.remove();
    element.style.position = originalPosition;
    element.style.visibility = originalVisibility;
    unregisterIntro(element);
    resolveFinished();
  };

  registerIntro(element, { cancel });

  let unitsDone = 0;
  const revealOrder = createRevealOrder(count);
  createClippedFrames(units, rects, overlay);

  const onUnitDone = () => {
    unitsDone++;
    if (unitsDone === count) {
      if (!isCanceled) {
        if (revertOnFinish) {
          splitResult.revert();
          overlay.remove();
          element.style.position = originalPosition;
          element.style.visibility = originalVisibility;
        } else {
          overlay.removeAttribute('aria-hidden');
        }
        unregisterIntro(element);
        resolveFinished();
      }
    }
  };

  revealOrder.forEach((unitIndex, revealIndex) => {
    const unit = units[unitIndex];
    const overlapJitter = revealIndex === 0 ? 0 : Math.random() * actualStagger * 1.5;
    const delay = revealIndex * actualStagger * 0.6 + overlapJitter;

    if (typeof unit.animate === 'function') {
      const anim = unit.animate(
        [
          { transform: randomStartTransform() },
          { transform: 'translate3d(0, 0, 0)' },
        ],
        { duration: actualUnitDuration, delay, easing, fill: 'both' }
      );
      animations.add(anim);
      anim.onfinish = () => {
        animations.delete(anim);
        onUnitDone();
      };
    } else {
      unit.style.transform = 'translate3d(0, 0, 0)';
      onUnitDone();
    }
  });

  return { finished, cancel };
}

/**
 * Directional reveal intro animation.
 * Reveals text through clipped character frames from randomized directions and an overlapping, imperfect order.
 * Supports immediate execution or scroll-triggered ('enter' | 'leave') activation across one or multiple targets.
 */
export function directionalReveal(target: Target, options?: DirectionalRevealOptions): AnimationHandle {
  return runAnimationWithTrigger(target, options, runSingleDirectionalReveal, 'intro');
}

