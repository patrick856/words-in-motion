import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { prefersReducedMotion, createDummyHandle, registerIntro, unregisterIntro, normalizeDuration, runAnimationWithTrigger } from '../core/motion';
import { splitChars, splitWords } from '../core/split';

export interface RiseOptions extends BaseOptions {
  /**
   * Total target duration of the effect in milliseconds.
   * Internal stagger and rise timings scale proportionally unless explicitly overridden.
   * @default 800
   */
  duration?: number;
  /** Direction from which elements arrive. 'ground' starts below, 'ceiling' starts above. Defaults to 'ground'. */
  from?: 'ground' | 'ceiling';
  /** Distance in pixels for initial offset when not masked. Defaults to 30. */
  distance?: number;
  /** Split granularity. Defaults to 'lines'. */
  by?: 'lines' | 'words' | 'chars';
  /** Whether to clip the animation within a bounding box. Defaults to true. */
  mask?: boolean;
  /** Whether to fade opacity during reveal. Defaults to true when unmasked, false when masked. */
  fade?: boolean;
}

const DEFAULT_DURATION = 800;
const DEFAULT_STAGGER = 30;

function hasBreakBetween(previous: HTMLElement, current: HTMLElement): boolean {
  let node: Node | null = previous.nextSibling;
  while (node && node !== current) {
    if (node.nodeName === 'BR') return true;
    node = node.nextSibling;
  }
  return false;
}

function groupWordsByLine(words: HTMLElement[]): HTMLElement[][] {
  if (words.length === 0) return [];

  const lines: HTMLElement[][] = [[words[0]]];
  let lineTop = words[0].getBoundingClientRect().top || words[0].offsetTop;

  for (let index = 1; index < words.length; index++) {
    const word = words[index];
    const top = word.getBoundingClientRect().top || word.offsetTop;
    const previous = words[index - 1];
    const lineHeight = word.getBoundingClientRect().height || word.offsetHeight || 16;
    const isNewLine = hasBreakBetween(previous, word) || top > lineTop + Math.max(4, lineHeight * 0.4);

    if (isNewLine) {
      lines.push([word]);
      lineTop = top;
    } else {
      lines[lines.length - 1].push(word);
    }
  }

  return lines;
}

function createLineMasks(element: HTMLElement, words: HTMLElement[]): HTMLElement[] {
  const lines = groupWordsByLine(words);
  if (lines.length === 0) return [];

  const fragment = document.createDocumentFragment();
  const lineContents: HTMLElement[] = [];

  lines.forEach((lineWords) => {
    const firstWord = lineWords[0];
    const rect = firstWord.getBoundingClientRect();
    const lineHeight = Math.ceil(rect.height || firstWord.offsetHeight || 24);
    const mask = document.createElement('span');
    const content = document.createElement('span');

    mask.classList.add('wim-line-mask');
    mask.style.display = 'block';
    mask.style.position = 'relative';
    mask.style.height = `${lineHeight}px`;
    mask.style.overflow = 'hidden';
    content.classList.add('wim-line');
    content.style.display = 'inline-block';
    content.style.whiteSpace = 'nowrap';

    lineWords.forEach((word) => {
      const space = word.nextSibling instanceof HTMLElement && word.nextSibling.classList.contains('wim-space')
        ? word.nextSibling
        : null;
      content.appendChild(word);
      if (space) content.appendChild(space);
    });

    mask.appendChild(content);
    fragment.appendChild(mask);
    lineContents.push(content);
  });

  element.replaceChildren(fragment);
  return lineContents;
}

function runSingleRise(element: HTMLElement, options?: RiseOptions): AnimationHandle {
  if (prefersReducedMotion()) return createDummyHandle();

  const duration = normalizeDuration(options?.duration, DEFAULT_DURATION);
  const timingScale = duration / DEFAULT_DURATION;

  const {
    from = 'ground',
    distance = 30,
    easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
    by = 'lines',
    mask = true,
    revertOnFinish = true,
  } = options || {};

  const actualStagger = typeof options?.stagger === 'number'
    ? Math.max(0, options.stagger)
    : Math.max(5, Math.round(DEFAULT_STAGGER * timingScale));

  const fade = options?.fade ?? (mask ? false : true);

  const splitResult = by === 'chars' ? splitChars(element) : splitWords(element);
  let units: HTMLElement[] = 'words' in splitResult ? splitResult.words : splitResult.chars;

  if (by === 'lines') {
    units = createLineMasks(element, units);
  }

  if (units.length === 0) {
    return createDummyHandle();
  }

  let isCanceled = false;
  const animations: Animation[] = [];
  let resolveFinished!: () => void;
  const finished = new Promise<void>((res) => { resolveFinished = res; });

  const cancel = () => {
    isCanceled = true;
    animations.forEach((a) => a.cancel());
    splitResult.revert();
    unregisterIntro(element);
    resolveFinished();
  };

  registerIntro(element, { cancel });

  if (mask) {
    units.forEach((unit: HTMLElement, index: number) => {
      // Each unit gets a clipped frame, so its off-position remains invisible
      // until it enters its final line position.
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      wrapper.style.overflow = 'hidden';
      wrapper.style.verticalAlign = 'top';

      unit.parentNode?.insertBefore(wrapper, unit);
      wrapper.appendChild(unit);

      unit.style.display = 'inline-block';

      if (fade) {
        unit.style.opacity = '0';
      }

      if (typeof unit.animate === 'function') {
        const initialY = from === 'ground' ? '100%' : '-100%';
        const keyframes: Keyframe[] = [
          { transform: `translateY(${initialY})` },
          { transform: 'translateY(0)' }
        ];
        if (fade) {
          keyframes[0].opacity = 0;
          keyframes[1].opacity = 1;
        }

        const anim = unit.animate(keyframes, {
          duration,
          delay: index * actualStagger,
          easing,
          fill: 'forwards',
        });
        animations.push(anim);
      } else {
        unit.style.opacity = '1';
        unit.style.transform = 'translateY(0)';
      }
    });
  } else {
    const initialY = from === 'ground' ? distance : -distance;
    units.forEach((unit: HTMLElement, index: number) => {
      if (fade) {
        unit.style.opacity = '0';
      }

      if (typeof unit.animate === 'function') {
        const keyframes: Keyframe[] = [
          { transform: `translate3d(0, ${initialY}px, 0)` },
          { transform: 'translate3d(0, 0, 0)' }
        ];
        if (fade) {
          keyframes[0].opacity = 0;
          keyframes[1].opacity = 1;
        }

        const anim = unit.animate(keyframes, {
          duration,
          delay: index * actualStagger,
          easing,
          fill: 'forwards',
        });
        animations.push(anim);
      } else {
        unit.style.opacity = '1';
        unit.style.transform = 'translate3d(0, 0, 0)';
      }
    });
  }

  Promise.all(animations.map(a => a.finished)).then(() => {
    if (!isCanceled) {
      if (revertOnFinish) splitResult.revert();
      unregisterIntro(element);
      resolveFinished();
    }
  }).catch(() => {});

  return { finished, cancel };
}

/**
 * Rise from ground / drop from ceiling intro animation.
 * Each word/character starts translated below (ground) or above (ceiling) its baseline and moves into place.
 * Supports immediate execution or scroll-triggered ('enter' | 'leave') activation across one or multiple targets.
 */
export function rise(target: Target, options?: RiseOptions): AnimationHandle {
  return runAnimationWithTrigger(target, options, runSingleRise, 'intro');
}

