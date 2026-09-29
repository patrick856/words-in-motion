import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  blackHole,
  paperCut,
  hingeDrop,
  blurAway,
  windScatter,
  breakAndFade,
} from '../../src/outro';
let element: HTMLElement;
beforeEach(() => {
  element = document.createElement('div');
  element.innerHTML = 'One <a href="#two">two</a><br>three<br>four';
  element.style.opacity = '0.8';
  document.body.append(element);
});
afterEach(() => {
  element.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe.each(
  Object.entries({ blackHole, paperCut, hingeDrop, blurAway, windScatter, breakAndFade })
)('%s lifecycle', (_name, effect) => {
  it('hides on completion and cancellation restores original style and live link', async () => {
    const original = element.innerHTML;
    const link = element.querySelector('a');
    const click = vi.fn();
    link?.addEventListener('click', click);
    const h = effect(element, { duration: 100 });
    await h.finished;
    expect(element.style.opacity).toBe('0');
    expect(element.innerHTML).toBe(original);
    h.cancel();
    h.cancel();
    expect(element.style.opacity).toBe('0.8');
    expect(element.querySelector('a')).toBe(link);
    link?.click();
    expect(click).toHaveBeenCalledTimes(1);
  });
  it('keep restores visibility consistently, including reduced motion', async () => {
    const h = effect(element, { keep: true });
    await h.finished;
    expect(element.style.opacity).toBe('0.8');
    h.cancel();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const reduced = effect(element, { keep: true });
    await reduced.finished;
    expect(element.style.opacity).toBe('0.8');
    reduced.cancel();
  });
  it('cancellation with real rejection semantics resolves and cannot hide text later', async () => {
    vi.spyOn(Element.prototype, 'animate').mockImplementation(() => {
      let reject!: (e: Error) => void;
      const finished = new Promise<Animation>((_r, j) => {
        reject = j;
      });
      return {
        finished,
        cancel: () => reject(new DOMException('Canceled', 'AbortError')),
      } as Animation;
    });
    const original = element.innerHTML;
    const h = effect(element);
    h.cancel();
    await h.finished;
    await Promise.resolve();
    expect(element.innerHTML).toBe(original);
    expect(element.style.opacity).toBe('0.8');
  });
});
