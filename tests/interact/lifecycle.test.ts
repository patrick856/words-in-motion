import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createInteraction, _getInteractDebug } from '../../src/core/interact';
import { obstaclePush, fontWeight, accentColor, proximityFlip } from '../../src/interact';
import { _getPointerTrackerDebug } from '../../src/core/pointer';
let element: HTMLElement;
let frame: FrameRequestCallback;
beforeEach(() => {
  element = document.createElement('div');
  element.innerHTML = '<a href="#">Link</a> text';
  document.body.append(element);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => {
  element.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('inactive pointer cannot displace obstacle text and exact-center contact remains finite', () => {
  const h = obstaclePush(element, { cursorRadius: 35, easing: 1 });
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: 0, clientY: 0 }));
  frame(performance.now());
  expect(element.querySelector<HTMLElement>('.wim-char')!.style.transform).toContain('translate3d');
  window.dispatchEvent(new Event('blur'));
  frame(performance.now());
  expect(element.querySelector<HTMLElement>('.wim-char')!.style.transform).toBe('');
  h.destroy();
});
it('normalizes invalid inputs, preserves node listeners and link accessible names', () => {
  const link = element.querySelector('a')!;
  const clicked = vi.fn();
  link.addEventListener('click', clicked);
  const original = element.innerHTML;
  const h = createInteraction(element, { radius: 0, easing: NaN }, (ctx) => {
    expect(ctx.options.radius).toBe(1);
    expect(ctx.options.easing).toBe(0.1);
    return { translateX: ctx.progress * 10 };
  });
  expect(link.getAttribute('aria-label')).toBe('Link');
  frame(performance.now());
  h.destroy();
  h.destroy();
  h.resume();
  expect(element.innerHTML).toBe(original);
  expect(element.querySelector('a')).toBe(link);
  link.click();
  expect(clicked).toHaveBeenCalledOnce();
  expect(_getPointerTrackerDebug().subscriberCount).toBe(0);
  expect(_getInteractDebug().elementCount).toBe(0);
});
it('weight and color preserve inherited appearance at rest', () => {
  element.style.color = 'rgb(240, 240, 240)';
  element.style.fontWeight = '600';
  const weight = fontWeight(element);
  const color = accentColor(element, { accentColor: 'rebeccapurple' });
  window.dispatchEvent(new Event('blur'));
  frame(performance.now());
  const char = element.querySelector<HTMLElement>('.wim-char')!;
  expect(char.style.fontWeight).toBe('');
  expect(char.style.color).toBe('');
  weight.destroy();
  color.destroy();
});
it('reduced motion prevents tilt even at the pointer center', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const h = proximityFlip(element, { easing: 1 });
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: 0, clientY: 0 }));
  frame(performance.now());
  expect(element.querySelector<HTMLElement>('.wim-char')!.style.transform).toBe('');
  h.destroy();
});
