export interface PointerState {
  x: number;
  y: number;
  isActive: boolean;
  isTouch: boolean;
}

export type PointerSubscriber = (state: PointerState) => void;

interface PointerTracker {
  state: PointerState;
  subscribers: Set<PointerSubscriber>;
  rafId: number | null;
  idleFrames: number;
  listenersAttached: boolean;
}

const tracker: PointerTracker = {
  state: {
    x: -9999,
    y: -9999,
    isActive: false,
    isTouch: false,
  },
  subscribers: new Set(),
  rafId: null,
  idleFrames: 0,
  listenersAttached: false,
};

const MAX_IDLE_FRAMES = 120; // ~2 seconds of stillness before rAF loop settles and pauses

function handlePointerMove(e: Event) {
  tracker.idleFrames = 0;

  if (typeof TouchEvent !== 'undefined' && e instanceof TouchEvent) {
    tracker.state.isTouch = true;
    if (e.touches && e.touches.length > 0) {
      tracker.state.x = e.touches[0].clientX;
      tracker.state.y = e.touches[0].clientY;
      tracker.state.isActive = true;
    }
  } else if (typeof PointerEvent !== 'undefined' && e instanceof PointerEvent) {
    tracker.state.isTouch = e.pointerType === 'touch';
    tracker.state.x = e.clientX;
    tracker.state.y = e.clientY;
    tracker.state.isActive = true;
  } else if (e instanceof MouseEvent) {
    tracker.state.isTouch = false;
    tracker.state.x = e.clientX;
    tracker.state.y = e.clientY;
    tracker.state.isActive = true;
  }

  startPointerLoop();
}

function handlePointerLeave() {
  tracker.state.isActive = false;
  tracker.idleFrames = 0;
  startPointerLoop();
}

function attachListeners() {
  if (tracker.listenersAttached || typeof window === 'undefined') return;

  const opt: AddEventListenerOptions = { passive: true };
  window.addEventListener('pointermove', handlePointerMove, opt);
  window.addEventListener('pointerdown', handlePointerMove, opt);
  window.addEventListener('pointerleave', handlePointerLeave, opt);
  window.addEventListener('pointercancel', handlePointerLeave, opt);
  window.addEventListener('touchmove', handlePointerMove, opt);
  window.addEventListener('touchstart', handlePointerMove, opt);
  window.addEventListener('touchend', handlePointerLeave, opt);

  tracker.listenersAttached = true;
}

function detachListeners() {
  if (!tracker.listenersAttached || typeof window === 'undefined') return;

  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerdown', handlePointerMove);
  window.removeEventListener('pointerleave', handlePointerLeave);
  window.removeEventListener('pointercancel', handlePointerLeave);
  window.removeEventListener('touchmove', handlePointerMove);
  window.removeEventListener('touchstart', handlePointerMove);
  window.removeEventListener('touchend', handlePointerLeave);

  tracker.listenersAttached = false;
}

function pointerLoop() {
  if (tracker.subscribers.size === 0) {
    stopPointerLoop();
    return;
  }

  for (const subscriber of tracker.subscribers) {
    subscriber(tracker.state);
  }

  tracker.idleFrames++;

  if (tracker.idleFrames > MAX_IDLE_FRAMES) {
    stopPointerLoop();
    return;
  }

  if (typeof requestAnimationFrame !== 'undefined') {
    tracker.rafId = requestAnimationFrame(pointerLoop);
  }
}

export function startPointerLoop() {
  if (
    tracker.rafId === null &&
    tracker.subscribers.size > 0 &&
    typeof requestAnimationFrame !== 'undefined'
  ) {
    tracker.rafId = requestAnimationFrame(pointerLoop);
  }
}

export function stopPointerLoop() {
  if (tracker.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(tracker.rafId);
    tracker.rafId = null;
  }
}

/**
 * Subscribes a callback to receive pointer state updates on each frame.
 * Returns an unsubscribe function.
 */
export function subscribePointer(subscriber: PointerSubscriber): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (tracker.subscribers.size === 0) {
    attachListeners();
  }

  tracker.subscribers.add(subscriber);
  tracker.idleFrames = 0;
  startPointerLoop();

  return () => {
    tracker.subscribers.delete(subscriber);
    if (tracker.subscribers.size === 0) {
      stopPointerLoop();
      detachListeners();
    }
  };
}

/**
 * Returns current pointer state snapshot.
 */
export function getPointerState(): PointerState {
  return tracker.state;
}

/**
 * Internal debug helper to inspect tracker state during testing.
 */
export function _getPointerTrackerDebug() {
  return {
    subscriberCount: tracker.subscribers.size,
    isLoopRunning: tracker.rafId !== null,
    listenersAttached: tracker.listenersAttached,
  };
}
