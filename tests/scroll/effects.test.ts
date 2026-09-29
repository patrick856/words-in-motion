import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waveRelay, readingLine, scatterReassemble } from '../../src/scroll';
import { createScrollScrub } from '../../src/core/scrollHelpers';
const callbacks = vi.hoisted(() => new Map<HTMLElement, (p: number) => void>());
vi.mock('../../src/core/scroll', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/core/scroll')>()),
  subscribeScrollScrub: vi.fn(
    ({ element, callback }: { element: HTMLElement; callback: (p: number) => void }) => {
      callbacks.set(element, callback);
      return () => callbacks.delete(element);
    }
  ),
}));
let element: HTMLElement;
beforeEach(() => {
  element = document.createElement('div');
  element.innerHTML = 'First <em>line</em><br>Second line<br>Third line';
  document.body.append(element);
});
afterEach(() => {
  callbacks.clear();
  element.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe.each(Object.entries({ waveRelay, readingLine, scatterReassemble }))(
  '%s scroll',
  (_name, effect) => {
    it('reaches exact rest at 100%, reverses, and restores original nodes on destroy', () => {
      const original = element.innerHTML;
      const em = element.querySelector('em');
      const h = effect(element, { smooth: 0.1 });
      const update = callbacks.get(element)!;
      update(0.5);
      update(1);
      for (const unit of element.querySelectorAll<HTMLElement>('.wim-char, .wim-word')) {
        expect(unit.style.transform).toBe('');
        expect(['', '1']).toContain(unit.style.opacity);
      }
      update(0);
      h.destroy();
      h.destroy();
      expect(element.innerHTML).toBe(original);
      expect(element.querySelector('em')).toBe(em);
      expect(callbacks.has(element)).toBe(false);
      h.resume();
      expect(element.innerHTML).toBe(original);
    });
    it('reduced motion leaves original readable DOM without subscriptions', () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      const original = element.innerHTML;
      const h = effect(element);
      expect(element.innerHTML).toBe(original);
      expect(callbacks.size).toBe(0);
      h.destroy();
    });
  }
);
it('readingLine animates words instead of letters', () => {
  const h = readingLine(element);
  expect(element.querySelectorAll('.wim-char')).toHaveLength(0);
  expect(element.querySelectorAll('.wim-word')).toHaveLength(6);
  callbacks.get(element)!(0.1);
  const words = element.querySelectorAll<HTMLElement>('.wim-word');
  expect(Number(words[0].style.opacity)).toBeGreaterThan(Number(words[1].style.opacity));
  h.destroy();
});
it('pause freezes, resume updates and replacement makes old handles harmless', () => {
  const a = scatterReassemble(element);
  const update = callbacks.get(element)!;
  update(0.5);
  a.pause();
  const frozen = element.innerHTML;
  update(0);
  expect(element.innerHTML).toBe(frozen);
  a.resume();
  const b = readingLine(element);
  const active = element.innerHTML;
  a.destroy();
  expect(element.innerHTML).toBe(active);
  b.destroy();
});
it('waveRelay uses independent geometry for each target and word fallback', () => {
  const second = document.createElement('div');
  second.textContent = 'مرحبا بالعالم';
  document.body.append(second);
  const h = waveRelay([element, second]);
  callbacks.get(element)!(0.5);
  callbacks.get(second)!(1);
  expect(second.querySelectorAll('.wim-word')).toHaveLength(2);
  for (const unit of second.querySelectorAll<HTMLElement>('.wim-word'))
    expect(unit.style.transform).toBe('');
  h.destroy();
  second.remove();
});
it('clears stale transforms when a custom scrub returns identity', () => {
  const h = createScrollScrub(element, undefined, ({ progress }) => ({
    translateX: progress < 1 ? 20 : 0,
  }));
  callbacks.get(element)!(0);
  expect(element.querySelector<HTMLElement>('.wim-char')!.style.transform).toContain('20px');
  callbacks.get(element)!(1);
  expect(element.querySelector<HTMLElement>('.wim-char')!.style.transform).toBe('');
  h.destroy();
});
