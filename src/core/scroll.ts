import { subscribeInView } from './inview';
import { clamp } from './math';

export type ScrollScrubCallback = (progress: number) => void;

export interface ScrollScrubSubscriber {
  element: HTMLElement;
  start?: string;
  end?: string;
  callback: ScrollScrubCallback;
}

export interface ScrollTriggerSubscriber {
  element: HTMLElement;
  trigger: 'enter' | 'leave';
  start?: string;
  once?: boolean;
  onTrigger: () => void;
  onReset?: () => void;
}

interface SubscriberInternal {
  sub: ScrollScrubSubscriber;
  inView: boolean;
  unsubscribeInView: () => void;
}

interface TriggerInternal {
  sub: ScrollTriggerSubscriber;
  isTriggered: boolean;
}

interface ScrollTracker {
  subscribers: Set<SubscriberInternal>;
  triggers: Set<TriggerInternal>;
  rafId: number | null;
  listenersAttached: boolean;
}

const tracker: ScrollTracker = {
  subscribers: new Set(),
  triggers: new Set(),
  rafId: null,
  listenersAttached: false,
};

export interface ScrollPositionResult {
  elementY: number;
  viewportY: number;
  diff: number; // elementY - viewportY: <= 0 means crossed/active, > 0 means below/inactive
}

/**
 * Parses a scroll position anchor string in format "[element anchor] [viewport anchor]".
 *
 * Element anchors: 'top', 'center', 'bottom'.
 * Viewport anchors: 'top' (0%), 'center' (50%), 'bottom' (100%), percentage (e.g. '80%'), or pixels (e.g. '100px').
 */
export function parseScrollAnchor(
  posStr: string | undefined,
  defaultStr: string = 'top 80%'
): {
  elementAnchor: 'top' | 'center' | 'bottom';
  evaluate: (elementRect: DOMRect, vh: number) => ScrollPositionResult;
} {
  const raw = (posStr && posStr.trim()) || defaultStr;
  const parts = raw.split(/\s+/).filter(Boolean);

  let elemAnchor: 'top' | 'center' | 'bottom' = 'top';
  if (parts[0] === 'center' || parts[0] === 'bottom' || parts[0] === 'top') {
    elemAnchor = parts[0];
  }

  const vpPart =
    parts[1] ||
    (parts[0] !== 'top' && parts[0] !== 'center' && parts[0] !== 'bottom' ? parts[0] : '80%');

  return {
    elementAnchor: elemAnchor,
    evaluate: (elementRect: DOMRect, vh: number): ScrollPositionResult => {
      let elemOffset = 0;
      if (elemAnchor === 'center') elemOffset = elementRect.height / 2;
      else if (elemAnchor === 'bottom') elemOffset = elementRect.height;

      let viewportY = vh * 0.8;
      if (vpPart === 'top') {
        viewportY = 0;
      } else if (vpPart === 'center') {
        viewportY = vh / 2;
      } else if (vpPart === 'bottom') {
        viewportY = vh;
      } else if (vpPart.endsWith('%')) {
        const pct = parseFloat(vpPart);
        if (!isNaN(pct)) viewportY = (pct / 100) * vh;
      } else if (vpPart.endsWith('px')) {
        const px = parseFloat(vpPart);
        if (!isNaN(px)) viewportY = px;
      } else if (!isNaN(Number(vpPart))) {
        const num = Number(vpPart);
        viewportY = num <= 1 && num >= 0 ? num * vh : num;
      }

      const elementY = elementRect.top + elemOffset;
      const diff = elementY - viewportY;

      return { elementY, viewportY, diff };
    },
  };
}

/**
 * Calculates normalized scroll progress (0..1) for a scrub effect between startStr and endStr.
 */
export function calculateScrollProgress(
  elementRect: DOMRect,
  vh: number,
  startStr?: string,
  endStr?: string
): number {
  const startEval = parseScrollAnchor(startStr, 'top 80%');
  const endEval = parseScrollAnchor(endStr, 'top 20%');

  const startDiff = startEval.evaluate(elementRect, vh).diff;
  const endDiff = endEval.evaluate(elementRect, vh).diff;

  const totalDist = endDiff - startDiff;
  if (totalDist === 0) return 0;

  // startDiff is 0 when element reaches start position
  // endDiff is 0 when element reaches end position
  const progress = -startDiff / totalDist;
  return clamp(progress, 0, 1);
}

function handleScrollOrResize() {
  if (tracker.triggers.size > 0 || tracker.subscribers.size > 0) {
    startScrollLoop();
  }
}

function attachScrollListeners() {
  if (tracker.listenersAttached || typeof window === 'undefined') return;

  const opt: AddEventListenerOptions = { passive: true, capture: true };
  window.addEventListener('scroll', handleScrollOrResize, opt);
  window.addEventListener('resize', handleScrollOrResize, { passive: true });

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => handleScrollOrResize()).catch(() => {});
  }

  tracker.listenersAttached = true;
}

function detachScrollListeners() {
  if (!tracker.listenersAttached || typeof window === 'undefined') return;

  window.removeEventListener('scroll', handleScrollOrResize, true);
  window.removeEventListener('resize', handleScrollOrResize);

  tracker.listenersAttached = false;
}

function scrollLoop() {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1000;

  // 1. Process scrub subscribers
  let activeInViewCount = 0;
  for (const item of tracker.subscribers) {
    const rect = item.sub.element.getBoundingClientRect();
    const progress = calculateScrollProgress(rect, vh, item.sub.start, item.sub.end);
    item.sub.callback(progress);
    if (item.inView) {
      activeInViewCount++;
    }
  }

  // 2. Process trigger subscribers
  const toRemoveTriggers: TriggerInternal[] = [];
  for (const item of tracker.triggers) {
    const sub = item.sub;
    const defaultStart = sub.trigger === 'leave' ? 'bottom 20%' : 'top 80%';
    const evaluator = parseScrollAnchor(sub.start, defaultStart);
    const rect = sub.element.getBoundingClientRect();
    const { diff } = evaluator.evaluate(rect, vh);

    if (diff <= 0) {
      if (!item.isTriggered) {
        item.isTriggered = true;
        sub.onTrigger();
        if (sub.once !== false) {
          toRemoveTriggers.push(item);
        }
      }
    } else {
      // diff > 0
      if (item.isTriggered && sub.once === false) {
        item.isTriggered = false;
        sub.onReset?.();
      }
    }
  }

  for (const item of toRemoveTriggers) {
    tracker.triggers.delete(item);
  }
  if (tracker.subscribers.size === 0 && tracker.triggers.size === 0) detachScrollListeners();

  if (activeInViewCount === 0) {
    stopScrollLoop();
    return;
  }

  if (typeof requestAnimationFrame !== 'undefined') {
    tracker.rafId = requestAnimationFrame(scrollLoop);
  }
}

export function startScrollLoop() {
  if (tracker.rafId === null && typeof requestAnimationFrame !== 'undefined') {
    tracker.rafId = requestAnimationFrame(scrollLoop);
  }
}

export function stopScrollLoop() {
  if (tracker.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(tracker.rafId);
    tracker.rafId = null;
  }
}

/**
 * Subscribes an element to the shared scroll scrub tracker.
 * Computes viewport progress (0..1) on scroll/rAF frame while in view.
 */
export function subscribeScrollScrub(sub: ScrollScrubSubscriber): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (tracker.subscribers.size === 0 && tracker.triggers.size === 0) {
    attachScrollListeners();
  }

  const internalItem: SubscriberInternal = {
    sub,
    inView: false,
    unsubscribeInView: () => {},
  };

  internalItem.unsubscribeInView = subscribeInView(sub.element, (isIntersecting) => {
    internalItem.inView = isIntersecting;
    if (isIntersecting) {
      startScrollLoop();
    }
  });

  tracker.subscribers.add(internalItem);
  startScrollLoop();

  return () => {
    internalItem.unsubscribeInView();
    tracker.subscribers.delete(internalItem);

    if (tracker.subscribers.size === 0 && tracker.triggers.size === 0) {
      stopScrollLoop();
      detachScrollListeners();
    }
  };
}

/**
 * Subscribes an element to geometric scroll position trigger evaluation.
 * Fires `onTrigger` when the element reaches the specified `start` position.
 */
export function subscribeScrollTrigger(sub: ScrollTriggerSubscriber): () => void {
  if (typeof window === 'undefined') {
    sub.onTrigger();
    return () => {};
  }

  if (tracker.subscribers.size === 0 && tracker.triggers.size === 0) {
    attachScrollListeners();
  }

  const internal: TriggerInternal = {
    sub,
    isTriggered: false,
  };

  tracker.triggers.add(internal);

  // Check immediately on subscription
  const vh = window.innerHeight || 1000;
  const defaultStart = sub.trigger === 'leave' ? 'bottom 20%' : 'top 80%';
  const evaluator = parseScrollAnchor(sub.start, defaultStart);
  const rect = sub.element.getBoundingClientRect();
  const { diff } = evaluator.evaluate(rect, vh);

  if (diff <= 0) {
    internal.isTriggered = true;
    sub.onTrigger();
    if (sub.once !== false) {
      tracker.triggers.delete(internal);
      if (tracker.subscribers.size === 0 && tracker.triggers.size === 0) {
        detachScrollListeners();
      }
      return () => {};
    }
  }

  startScrollLoop();

  return () => {
    tracker.triggers.delete(internal);
    if (tracker.subscribers.size === 0 && tracker.triggers.size === 0) {
      stopScrollLoop();
      detachScrollListeners();
    }
  };
}

/**
 * Debug helper to inspect scrub tracker state.
 */
export function _getScrollTrackerDebug() {
  return {
    subscriberCount: tracker.subscribers.size,
    triggerCount: tracker.triggers.size,
    isLoopRunning: tracker.rafId !== null,
    listenersAttached: tracker.listenersAttached,
  };
}
