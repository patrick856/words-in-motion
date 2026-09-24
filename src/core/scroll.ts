import { subscribeInView } from './inview';
import { clamp } from './math';

export type ScrollScrubCallback = (progress: number) => void;

export interface ScrollScrubSubscriber {
  element: HTMLElement;
  start?: string;
  end?: string;
  callback: ScrollScrubCallback;
}

interface SubscriberInternal {
  sub: ScrollScrollSubscriber;
  inView: boolean;
  unsubscribeInView: () => void;
}

type ScrollScrollSubscriber = ScrollScrubSubscriber;

interface ScrollTracker {
  subscribers: Set<SubscriberInternal>;
  rafId: number | null;
  listenersAttached: boolean;
}

const tracker: ScrollTracker = {
  subscribers: new Set(),
  rafId: null,
  listenersAttached: false,
};

function parsePos(
  posStr: string | undefined,
  defaultStr: string,
  elementRect: DOMRect,
  vh: number
): number {
  const str = (posStr || defaultStr).trim();
  const parts = str.split(/\s+/);
  const elemRef = parts[0] || 'top';
  const vhRef = parts[1] || '80%';

  let elemOffsetY = 0;
  if (elemRef === 'center') elemOffsetY = elementRect.height / 2;
  else if (elemRef === 'bottom') elemOffsetY = elementRect.height;

  let vhPercent = 0.8;
  if (vhRef.endsWith('%')) {
    vhPercent = parseFloat(vhRef) / 100;
  } else if (!isNaN(Number(vhRef))) {
    vhPercent = Number(vhRef) / vh;
  }

  const targetVhY = vh * vhPercent;
  const currentElemY = elementRect.top + elemOffsetY;

  return currentElemY - targetVhY;
}

export function calculateScrollProgress(
  elementRect: DOMRect,
  vh: number,
  startStr?: string,
  endStr?: string
): number {
  const strStart = startStr || 'top 80%';
  const strEnd = endStr || 'top 20%';

  const startDiff = parsePos(strStart, 'top 80%', elementRect, vh);
  const endDiff = parsePos(strEnd, 'top 20%', elementRect, vh);

  const totalDist = endDiff - startDiff;
  if (totalDist === 0) return 0;

  // startDiff is 0 when element reaches start position
  // endDiff is 0 when element reaches end position
  const progress = -startDiff / totalDist;
  return clamp(progress, 0, 1);
}

function handleScrollOrResize() {
  startScrollLoop();
}

function attachScrollListeners() {
  if (tracker.listenersAttached || typeof window === 'undefined') return;

  const opt: AddEventListenerOptions = { passive: true };
  window.addEventListener('scroll', handleScrollOrResize, opt);
  window.addEventListener('resize', handleScrollOrResize, opt);

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => handleScrollOrResize()).catch(() => {});
  }

  tracker.listenersAttached = true;
}

function detachScrollListeners() {
  if (!tracker.listenersAttached || typeof window === 'undefined') return;

  window.removeEventListener('scroll', handleScrollOrResize);
  window.removeEventListener('resize', handleScrollOrResize);

  tracker.listenersAttached = false;
}

function scrollLoop() {
  let activeInViewCount = 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1000;

  for (const item of tracker.subscribers) {
    if (item.inView) {
      activeInViewCount++;
      const rect = item.sub.element.getBoundingClientRect();
      const progress = calculateScrollProgress(rect, vh, item.sub.start, item.sub.end);
      item.sub.callback(progress);
    }
  }

  if (activeInViewCount === 0) {
    stopScrollLoop();
    return;
  }

  if (typeof requestAnimationFrame !== 'undefined') {
    tracker.rafId = requestAnimationFrame(scrollLoop);
  }
}

export function startScrollLoop() {
  if (tracker.rafId === null && tracker.subscribers.size > 0 && typeof requestAnimationFrame !== 'undefined') {
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

  if (tracker.subscribers.size === 0) {
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

    if (tracker.subscribers.size === 0) {
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
    isLoopRunning: tracker.rafId !== null,
    listenersAttached: tracker.listenersAttached,
  };
}
