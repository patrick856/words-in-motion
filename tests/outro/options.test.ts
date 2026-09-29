import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as outros from '../../src/outro';
import { registry } from '../../playground/registry';
let element: HTMLElement;
beforeEach(() => {
  element = document.createElement('div');
  element.textContent = 'New outro';
  document.body.append(element);
});
afterEach(() => {
  element.remove();
  vi.restoreAllMocks();
});
it('exports and registers exactly six outros', () => {
  const names = [
    'blackHole',
    'paperCut',
    'breakAndFade',
    'hingeDrop',
    'blurAway',
    'windScatter',
  ].sort();
  expect(Object.keys(outros).sort()).toEqual(names);
  expect(
    registry
      .filter((entry) => entry.category === 'outro')
      .map((entry) => entry.name)
      .sort()
  ).toEqual(names);
});
it('hingeDrop pivots generated units and honors its drop distance', () => {
  const animate = vi.spyOn(Element.prototype, 'animate');
  const handle = outros.hingeDrop(element, { distance: 2 });
  expect(element.querySelector<HTMLElement>('.wim-char')!.style.transformOrigin).toBe('0% 0%');
  const frames = animate.mock.calls[0][0] as Keyframe[];
  expect(frames.at(-1)!.transform).toContain('2em');
  expect(frames.at(-1)!.opacity).toBe(0);
  handle.cancel();
});
it('blurAway uses whole words and bounds excessive blur', () => {
  const animate = vi.spyOn(Element.prototype, 'animate');
  const handle = outros.blurAway(element, { blur: 100, distance: NaN });
  expect(element.querySelectorAll('.wim-char')).toHaveLength(0);
  const frames = animate.mock.calls[0][0] as Keyframe[];
  expect(frames.at(-1)!.filter).toBe('blur(32px)');
  expect(JSON.stringify(frames)).not.toContain('NaN');
  handle.cancel();
});
it('windScatter reverses direction and remains deterministic', () => {
  const animate = vi.spyOn(Element.prototype, 'animate');
  const right = outros.windScatter(element, { direction: 'right', distance: 2 });
  const first = animate.mock.calls[0][0] as Keyframe[];
  right.cancel();
  animate.mockClear();
  const left = outros.windScatter(element, { direction: 'left', distance: 2 });
  const reversed = animate.mock.calls[0][0] as Keyframe[];
  const travel = (frames: Keyframe[]) =>
    Number(String(frames.at(-1)!.transform).match(/translate3d\(([-\d.]+)em/)![1]);
  expect(travel(reversed)).toBe(-travel(first));
  left.cancel();
  animate.mockClear();
  const repeat = outros.windScatter(element, { direction: 'right', distance: 2 });
  expect(animate.mock.calls[0][0]).toEqual(first);
  repeat.cancel();
});
