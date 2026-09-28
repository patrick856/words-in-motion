import type {
  AnimationHandle,
  BaseScrollScrubOptions,
  BaseScrollTriggerOptions,
  ScrollScrubHandle,
  ScrollTriggerHandle,
  Target,
} from './types';
import { resolveElements, prefersReducedMotion } from './motion';
import { splitChars, splitWords } from './split';
import { calculateScrollProgress, subscribeScrollScrub, subscribeScrollTrigger } from './scroll';
import { bounded, ownEffect, stopEffect } from './effect';
import { createCharMeasurer, type CharMeasure } from './measure';

export interface ScrollScrubUpdateContext {
  progress: number;
  index: number;
  total: number;
  char: HTMLElement;
  element: HTMLElement;
  /** Resting positions, refreshed after layout or font changes. */
  measures: CharMeasure[];
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
export type ScrollTriggerPlayCallback = (element: HTMLElement) => AnimationHandle;
const dummyScrub = (): ScrollScrubHandle => ({ destroy() {}, pause() {}, resume() {} });

function singleTrigger(
  element: HTMLElement,
  options?: BaseScrollTriggerOptions,
  play?: ScrollTriggerPlayCallback
): ScrollTriggerHandle {
  if (options?.respectReducedMotion !== false && prefersReducedMotion())
    return { finished: Promise.resolve(), cancel() {}, destroy() {} };
  let active: AnimationHandle | undefined;
  let destroyed = false;
  let resolve!: () => void;
  const finished = new Promise<void>((r) => {
    resolve = r;
  });
  const unsubscribe = subscribeScrollTrigger({
    element,
    trigger: 'enter',
    start: options?.start ?? 'top 80%',
    once: options?.repeat ? false : options?.once !== false,
    onTrigger: () => {
      if (destroyed) return;
      active?.cancel();
      active = play?.(element);
      if (active) void active.finished.then(resolve, resolve);
      else resolve();
    },
    onReset: () => {
      active?.cancel();
      active = undefined;
    },
  });
  const cancel = () => {
    active?.cancel();
    active = undefined;
    resolve();
  };
  return {
    finished,
    cancel,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      cancel();
    },
  };
}
export function createScrollTrigger(
  target: Target,
  options?: BaseScrollTriggerOptions,
  play?: ScrollTriggerPlayCallback
): ScrollTriggerHandle {
  const handles = [...new Set(resolveElements(target))].map((el) =>
    singleTrigger(el, options, play)
  );
  return {
    finished: Promise.all(handles.map((h) => h.finished)).then(() => {}),
    cancel: () => handles.forEach((h) => h.cancel()),
    destroy: () => handles.forEach((h) => h.destroy()),
  };
}

function singleScrub(
  element: HTMLElement,
  options?: BaseScrollScrubOptions,
  update?: ScrollScrubUpdateCallback
): ScrollScrubHandle {
  stopEffect(element);
  if (options?.respectReducedMotion !== false && prefersReducedMotion()) return dummyScrub();
  const split = options?.by === 'words' ? splitWords(element) : splitChars(element);
  const chars = 'words' in split ? split.words : split.chars;
  if (!chars.length) {
    split.revert();
    return dummyScrub();
  }
  const measurer = createCharMeasurer(element, chars);
  let destroyed = false;
  let paused = false;
  let current: number | undefined;
  let lastTime = performance.now();
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const render = (raw: number) => {
    if (destroyed || paused) return;
    const reduced = options?.respectReducedMotion !== false && media?.matches;
    const now = performance.now();
    const smooth = reduced ? 1 : bounded(options?.smooth, 1, 0.01, 1);
    const factor =
      1 - Math.pow(1 - smooth, Math.min(4, Math.max(0.25, (now - lastTime) / (1000 / 60))));
    lastTime = now;
    const target = reduced ? 1 : bounded(raw, 0, 0, 1);
    current =
      current === undefined || target === 0 || target === 1
        ? target
        : current + (target - current) * factor;
    const measures = measurer.getMeasures();
    chars.forEach((char, index) => {
      const styles = update?.({
        progress: current!,
        index,
        total: chars.length,
        char,
        element,
        measures,
      });
      if (!styles) return;
      const x = bounded(styles.translateX, 0, -100000, 100000);
      const y = bounded(styles.translateY, 0, -100000, 100000);
      const scale = bounded(styles.scale, 1, 0, 100);
      const rotate = bounded(styles.rotate, 0, -3600, 3600);
      char.style.transform =
        styles.transform ??
        (x || y || scale !== 1 || rotate
          ? `translate3d(${x}px,${y}px,0) scale(${scale}) rotate(${rotate}deg)`
          : '');
      char.style.opacity =
        styles.opacity === undefined ? '' : String(bounded(styles.opacity, 1, 0, 1));
      char.style.filter = styles.filter ?? '';
    });
  };
  const read = () =>
    calculateScrollProgress(
      element.getBoundingClientRect(),
      window.innerHeight,
      options?.start,
      options?.end
    );
  render(read());
  const unsubscribe = subscribeScrollScrub({
    element,
    start: options?.start,
    end: options?.end,
    callback: render,
  });
  let release = () => {};
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    unsubscribe();
    measurer.destroy();
    split.revert();
    release();
    media?.removeEventListener?.('change', preference);
  };
  const preference = () => {
    if (media?.matches && options?.respectReducedMotion !== false) destroy();
  };
  media?.addEventListener?.('change', preference);
  release = ownEffect(element, destroy);
  return {
    destroy,
    pause: () => {
      paused = true;
    },
    resume: () => {
      if (!destroyed) {
        paused = false;
        current = undefined;
        render(read());
      }
    },
  };
}
export function createScrollScrub(
  target: Target,
  options?: BaseScrollScrubOptions,
  update?: ScrollScrubUpdateCallback
): ScrollScrubHandle {
  const handles = [...new Set(resolveElements(target))].map((el) =>
    singleScrub(el, options, update)
  );
  return {
    destroy: () => handles.forEach((h) => h.destroy()),
    pause: () => handles.forEach((h) => h.pause()),
    resume: () => handles.forEach((h) => h.resume()),
  };
}
