import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wave, float, breathe, shimmer, pendulum } from '../../src/loop';
import { blackHole } from '../../src/outro';
import { createInteraction } from '../../src/core/interact';
import type { AnimationHandle } from '../../src/core/types';

const effects = { wave, float, breathe, shimmer, pendulum };
let element: HTMLElement;
let handles: AnimationHandle[];
let cancellations: ReturnType<typeof vi.fn>[];
beforeEach(() => {
  handles = [];
  cancellations = [];
  element = document.createElement('div');
  element.innerHTML = 'Hello <em>world 👩🏽‍💻</em><br>مرحبا بالعالم';
  document.body.append(element);
  vi.spyOn(Element.prototype, 'animate').mockImplementation(() => {
    let reject!: (e: Error) => void;
    const finished = new Promise<Animation>((_resolve, r) => {
      reject = r;
    });
    const cancel = vi.fn(() => reject(new DOMException('Canceled', 'AbortError')));
    cancellations.push(cancel);
    return { finished, cancel, pause: vi.fn(), play: vi.fn() } as unknown as Animation;
  });
});
afterEach(() => {
  handles.forEach((h) => h.cancel());
  element.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(Object.entries(effects))('%s loop', (_name, effect) => {
  it('repeats until cancellation, restores nodes and settles without AbortError', async () => {
    const original = element.innerHTML;
    const em = element.querySelector('em');
    const h = effect(element);
    handles.push(h);
    let finished = false;
    void h.finished.then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(finished).toBe(false);
    expect(element.querySelector('em')).toBe(em);
    expect(element.querySelector('br')).not.toBeNull();
    for (const call of vi.mocked(Element.prototype.animate).mock.calls)
      expect((call[1] as KeyframeAnimationOptions).iterations).toBe(Infinity);
    h.cancel();
    h.cancel();
    await expect(h.finished).resolves.toBeUndefined();
    expect(element.innerHTML).toBe(original);
    expect(element.querySelector('em')).toBe(em);
    expect(cancellations.every((c) => c.mock.calls.length === 1)).toBe(true);
  });
  it('does not split or animate in reduced motion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const original = element.innerHTML;
    const h = effect(element);
    handles.push(h);
    await h.finished;
    expect(Element.prototype.animate).not.toHaveBeenCalled();
    expect(element.innerHTML).toBe(original);
  });
});
it('replaces previous effects and ignores stale cancellation', async () => {
  const original = element.innerHTML;
  const a = wave(element);
  handles.push(a);
  const b = shimmer(element);
  handles.push(b);
  await a.finished;
  const live = element.innerHTML;
  a.cancel();
  expect(element.innerHTML).toBe(live);
  b.cancel();
  expect(element.innerHTML).toBe(original);
});
it('takes ownership from composed interactions and hands it to outros', async () => {
  const original = element.innerHTML;
  const interaction = createInteraction(element);
  const a = wave(element);
  handles.push(a);
  interaction.destroy();
  expect(element.querySelectorAll('.wim-word .wim-word')).toHaveLength(0);
  const b = blackHole(element);
  handles.push(b);
  await a.finished;
  b.cancel();
  expect(element.innerHTML).toBe(original);
});
it('bounds invalid options and deduplicates targets', () => {
  element.textContent = 'Hi';
  const h = wave([element, element], {
    duration: NaN,
    stagger: Infinity,
    delay: -50,
    intensity: NaN,
  });
  handles.push(h);
  expect(Element.prototype.animate).toHaveBeenCalledTimes(2);
  for (const [frames, timing] of vi.mocked(Element.prototype.animate).mock.calls) {
    expect(JSON.stringify(frames)).not.toMatch(/NaN|Infinity/);
    expect((timing as KeyframeAnimationOptions).duration).toBe(2400);
    expect(Number((timing as KeyframeAnimationOptions).delay)).toBeGreaterThanOrEqual(0);
  }
});
it('settles cancellation before a scroll trigger fires', async () => {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ top: 10000, height: 30 } as DOMRect);
  const h = wave(element, { trigger: 'enter' });
  handles.push(h);
  h.cancel();
  await expect(h.finished).resolves.toBeUndefined();
  expect(Element.prototype.animate).not.toHaveBeenCalled();
});
it('cleans up partial setup when WAAPI rejects an easing', () => {
  const original = element.innerHTML;
  vi.mocked(Element.prototype.animate).mockImplementationOnce(() => {
    throw new TypeError('Invalid easing');
  });
  expect(() => wave(element, { easing: 'bogus' })).toThrow();
  expect(element.innerHTML).toBe(original);
});
