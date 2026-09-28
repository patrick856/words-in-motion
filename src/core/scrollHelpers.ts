import type {
  AnimationHandle,
  BaseScrollScrubOptions,
  BaseScrollTriggerOptions,
  ScrollScrubHandle,
  ScrollTriggerHandle,
  Target,
} from './types';
import { resolveElements, prefersReducedMotion } from './motion';
import { splitChars } from './split';
import { subscribeScrollScrub, subscribeScrollTrigger } from './scroll';
import { lerp } from './math';

export interface ScrollScrubUpdateContext {
  progress: number;
  index: number;
  total: number;
  char: HTMLElement;
  element: HTMLElement;
}

export interface ScrollCharTargetStyles {
  transform?: string;
  opacity?: number;
  filter?: string;

  translateX?: number;
  translateY?: number;
  scale?: number;
  rotate?: number;
}

export type ScrollScrubUpdateCallback = (
  ctx: ScrollScrubUpdateContext
) => ScrollCharTargetStyles | void;

export type ScrollTriggerPlayCallback = (
  element: HTMLElement
) => AnimationHandle;

function createDummyTriggerHandle(): ScrollTriggerHandle {
  return {
    finished: Promise.resolve(),
    cancel: () => {},
    destroy: () => {},
  };
}

function createDummyScrubHandle(): ScrollScrubHandle {
  return {
    destroy: () => {},
    pause: () => {},
    resume: () => {},
  };
}

function createSingleScrollTrigger(
  element: HTMLElement,
  options?: BaseScrollTriggerOptions,
  play?: ScrollTriggerPlayCallback
): ScrollTriggerHandle {
  const opts: BaseScrollTriggerOptions = {
    start: 'top 80%',
    once: true,
    repeat: false,
    respectReducedMotion: true,
    ...options,
  };

  const isOnce = opts.repeat === true ? false : opts.once !== false;
  const isReducedMotion = opts.respectReducedMotion !== false && prefersReducedMotion();

  let activeAnimation: AnimationHandle | null = null;
  let finishedResolve: () => void = () => {};

  const finishedPromise = new Promise<void>((resolve) => {
    finishedResolve = resolve;
  });

  const triggerAnimation = () => {
    if (activeAnimation) {
      activeAnimation.cancel();
      activeAnimation = null;
    }

    if (isReducedMotion) {
      finishedResolve();
      return;
    }

    if (play) {
      activeAnimation = play(element);
      activeAnimation.finished
        .then(() => {
          finishedResolve();
        })
        .catch(() => {});
    } else {
      finishedResolve();
    }
  };

  const unsubscribeTrigger = subscribeScrollTrigger({
    element,
    trigger: 'enter',
    start: opts.start,
    once: isOnce,
    onTrigger: triggerAnimation,
    onReset: () => {
      if (activeAnimation) {
        activeAnimation.cancel();
        activeAnimation = null;
      }
    },
  });

  const cancel = () => {
    if (activeAnimation) {
      activeAnimation.cancel();
      activeAnimation = null;
    }
  };

  const destroy = () => {
    cancel();
    unsubscribeTrigger();
  };

  return {
    finished: finishedPromise,
    cancel,
    destroy,
  };
}

/**
 * Foundation factory for creating trigger-mode scroll animations (plays when element reaches viewport scroll position).
 */
export function createScrollTrigger(
  target: Target,
  options?: BaseScrollTriggerOptions,
  play?: ScrollTriggerPlayCallback
): ScrollTriggerHandle {
  const elements = resolveElements(target);
  if (elements.length === 0) {
    return createDummyTriggerHandle();
  }

  if (elements.length === 1) {
    return createSingleScrollTrigger(elements[0], options, play);
  }

  const handles = elements.map((el) => createSingleScrollTrigger(el, options, play));
  return {
    finished: Promise.all(handles.map((h) => h.finished)).then(() => {}),
    cancel: () => handles.forEach((h) => h.cancel()),
    destroy: () => handles.forEach((h) => h.destroy()),
  };
}

function createSingleScrollScrub(
  element: HTMLElement,
  options?: BaseScrollScrubOptions,
  update?: ScrollScrubUpdateCallback
): ScrollScrubHandle {
  const opts: BaseScrollScrubOptions = {
    start: 'top 80%',
    end: 'top 20%',
    smooth: 1,
    respectReducedMotion: true,
    ...options,
  };

  const isReducedMotion = opts.respectReducedMotion !== false && prefersReducedMotion();

  // Split text into character spans
  const { chars, revert } = splitChars(element);
  if (chars.length === 0) {
    return createDummyScrubHandle();
  }

  let isPaused = false;
  let currentProgress = 0;

  // Track per-character interpolated state
  const charStates = chars.map(() => ({
    currX: 0,
    currY: 0,
    currScale: 1,
    currRotate: 0,
    currOpacity: 1,
  }));

  const handleScrollProgress = (rawProgress: number) => {
    if (isPaused) return;

    const targetProgress = isReducedMotion ? 1 : rawProgress;
    const smoothFactor = opts.smooth ?? 1;

    currentProgress = smoothFactor >= 1 ? targetProgress : lerp(currentProgress, targetProgress, smoothFactor);

    for (let i = 0; i < chars.length; i++) {
      const charEl = chars[i];
      let targetStyles: ScrollCharTargetStyles | void = undefined;

      if (update) {
        targetStyles = update({
          progress: currentProgress,
          index: i,
          total: chars.length,
          char: charEl,
          element,
        });
      }

      if (targetStyles) {
        const state = charStates[i];

        const targetX = targetStyles.translateX ?? 0;
        const targetY = targetStyles.translateY ?? 0;
        const targetScale = targetStyles.scale ?? 1;
        const targetRotate = targetStyles.rotate ?? 0;
        const targetOpacity = targetStyles.opacity ?? 1;

        if (smoothFactor >= 1) {
          state.currX = targetX;
          state.currY = targetY;
          state.currScale = targetScale;
          state.currRotate = targetRotate;
          state.currOpacity = targetOpacity;
        } else {
          state.currX = lerp(state.currX, targetX, smoothFactor);
          state.currY = lerp(state.currY, targetY, smoothFactor);
          state.currScale = lerp(state.currScale, targetScale, smoothFactor);
          state.currRotate = lerp(state.currRotate, targetRotate, smoothFactor);
          state.currOpacity = lerp(state.currOpacity, targetOpacity, smoothFactor);
        }

        let transformStr = targetStyles.transform;
        if (!transformStr && (state.currX || state.currY || state.currScale !== 1 || state.currRotate)) {
          transformStr = `translate3d(${state.currX.toFixed(2)}px, ${state.currY.toFixed(2)}px, 0) scale(${state.currScale.toFixed(3)}) rotate(${state.currRotate.toFixed(2)}deg)`;
        }

        if (transformStr !== undefined) {
          charEl.style.transform = transformStr;
        }
        if (targetStyles.opacity !== undefined || state.currOpacity !== 1) {
          charEl.style.opacity = state.currOpacity.toFixed(3);
        }
        if (targetStyles.filter !== undefined) {
          charEl.style.filter = targetStyles.filter;
        }
      }
    }
  };

  const unsubscribeScroll = subscribeScrollScrub({
    element,
    start: opts.start,
    end: opts.end,
    callback: handleScrollProgress,
  });

  const destroy = () => {
    unsubscribeScroll();
    revert();
  };

  const pause = () => {
    isPaused = true;
  };

  const resume = () => {
    isPaused = false;
  };

  return {
    destroy,
    pause,
    resume,
  };
}

/**
 * Foundation factory for creating scrub-mode scroll animations (progress directly tied to scroll position).
 */
export function createScrollScrub(
  target: Target,
  options?: BaseScrollScrubOptions,
  update?: ScrollScrubUpdateCallback
): ScrollScrubHandle {
  const elements = resolveElements(target);
  if (elements.length === 0) {
    return createDummyScrubHandle();
  }

  if (elements.length === 1) {
    return createSingleScrollScrub(elements[0], options, update);
  }

  const handles = elements.map((el) => createSingleScrollScrub(el, options, update));
  return {
    destroy: () => handles.forEach((h) => h.destroy()),
    pause: () => handles.forEach((h) => h.pause()),
    resume: () => handles.forEach((h) => h.resume()),
  };
}
