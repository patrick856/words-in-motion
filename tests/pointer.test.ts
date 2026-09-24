import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  subscribePointer,
  getPointerState,
  _getPointerTrackerDebug,
  PointerState,
} from '../src/core/pointer';

describe('Shared Pointer Tracker (core/pointer.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches listeners lazily on first subscriber and detaches when all unsubscribe', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const sub1 = vi.fn();
    const unsub1 = subscribePointer(sub1);

    expect(addEventListenerSpy).toHaveBeenCalled();
    const debugBefore = _getPointerTrackerDebug();
    expect(debugBefore.subscriberCount).toBe(1);
    expect(debugBefore.listenersAttached).toBe(true);

    const sub2 = vi.fn();
    const unsub2 = subscribePointer(sub2);
    expect(_getPointerTrackerDebug().subscriberCount).toBe(2);

    unsub1();
    expect(_getPointerTrackerDebug().subscriberCount).toBe(1);
    expect(_getPointerTrackerDebug().listenersAttached).toBe(true);

    unsub2();
    expect(_getPointerTrackerDebug().subscriberCount).toBe(0);
    expect(_getPointerTrackerDebug().listenersAttached).toBe(false);
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });

  it('starts and stops rAF loop based on subscribers', () => {
    const sub = vi.fn();
    const unsub = subscribePointer(sub);

    const debug1 = _getPointerTrackerDebug();
    expect(debug1.isLoopRunning).toBe(true);

    unsub();
    const debug2 = _getPointerTrackerDebug();
    expect(debug2.isLoopRunning).toBe(false);
  });

  it('updates pointer position on pointermove event', () => {
    const sub = vi.fn();
    const unsub = subscribePointer(sub);

    const event = new MouseEvent('pointermove', {
      clientX: 250,
      clientY: 350,
    });
    window.dispatchEvent(event);

    const state: PointerState = getPointerState();
    expect(state.x).toBe(250);
    expect(state.y).toBe(350);
    expect(state.isActive).toBe(true);

    unsub();
  });
});
