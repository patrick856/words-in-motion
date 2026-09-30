import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pull, push, obstaclePush, proximityRotate } from '../../src/interact';
import type { InteractHandle } from '../../src/core/types';
let element: HTMLElement;
let frame: FrameRequestCallback;
let now: number;
let handles: InteractHandle[];
function tick(count = 1) {
  for (let i = 0; i < count; i++) {
    now += 1000 / 60;
    frame(now);
  }
}
function move(x: number, y: number) {
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }));
  tick();
}
function positions() {
  return Array.from(element.querySelectorAll<HTMLElement>('.wim-char')).map((char, i) => {
    const match = char.style.transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
    return { x: i * 14 + 7 + Number(match?.[1] ?? 0), y: 12 + Number(match?.[2] ?? 0) };
  });
}
function checkContacts() {
  const letters = positions();
  for (let i = 0; i < letters.length; i++)
    for (let j = i + 1; j < letters.length; j++) {
      const px = 14 - Math.abs(letters[j].x - letters[i].x);
      const py = 24 - Math.abs(letters[j].y - letters[i].y);
      expect(Math.min(px, py), `overlap ${i},${j}`).toBeLessThan(0.02);
    }
}
function hasOverlap() {
  const letters = positions();
  return letters.some((a, i) =>
    letters.slice(i + 1).some((b) =>
      Math.min(14 - Math.abs(b.x - a.x), 24 - Math.abs(b.y - a.y)) > 0.02
    )
  );
}
it('default obstaclePush has no surrounding influence, even with a large radius option', () => {
  const h = obstaclePush(element, { radius: 1000, easing: 1 });
  handles.push(h);
  const home = positions();
  move(63, -1);
  tick(3);
  expect(positions()).toEqual(home);
  move(63, 0);
  expect(positions()).toEqual(home);
  move(63, 2);
  expect(positions()).not.toEqual(home);
  checkContacts();
  window.dispatchEvent(new Event('blur'));
  tick(2);
  expect(positions()).toEqual(home);
});
it('zero strength disables point contact', () => {
  const h = obstaclePush(element, { strength: 0 });
  handles.push(h);
  const home = positions();
  move(63, 12);
  tick(20);
  expect(positions()).toEqual(home);
});
beforeEach(() => {
  now = 0;
  handles = [];
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  element = document.createElement('div');
  element.textContent = 'ABCDEFGHIJKL';
  document.body.append(element);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const index = Array.from(element.querySelectorAll('.wim-char')).indexOf(this);
    const x = index < 0 ? 0 : index * 14;
    const width = index < 0 ? 168 : 14;
    return {
      x,
      y: 0,
      left: x,
      top: 0,
      right: x + width,
      bottom: 24,
      width,
      height: 24,
      toJSON() {},
    };
  });
});
afterEach(() => {
  handles.forEach((h) => h.destroy());
  element.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe.each(Object.entries({ pull, push }))('%s soft letters', (_name, effect) => {
  it('allows overlap during movement and returns every letter home on pointer leave', () => {
    const h = effect(element, { easing: 0.2, strength: 60, radius: 100 });
    handles.push(h);
    move(20, 12);
    expect(hasOverlap()).toBe(true);
    for (const [x, y] of [
      [80, 12],
      [130, 12],
      [50, 0],
      [90, 30],
      [200, 20],
    ]) {
      move(x, y);
      tick(10);
    }
    window.dispatchEvent(new Event('blur'));
    tick(200);
    positions().forEach((p, i) => {
      expect(p.x).toBeCloseTo(i * 14 + 7, 2);
      expect(p.y).toBeCloseTo(12, 2);
    });
  });
  it('pauses and resumes without nested spans', () => {
    const h = effect(element);
    handles.push(h);
    move(60, 12);
    tick(20);
    h.pause();
    tick(220);
    positions().forEach((p, i) => expect(p.x).toBeCloseTo(i * 14 + 7, 2));
    h.resume();
    tick(20);
    expect(positions().some((p, i) => Math.abs(p.x - (i * 14 + 7)) > 0.1)).toBe(true);
    expect(element.querySelectorAll('.wim-char .wim-char')).toHaveLength(0);
  });
});
describe('obstaclePush solid letters', () => {
  it('prevents overlap during movement and returns every letter home on pointer leave', () => {
    const h = obstaclePush(element, { easing: 0.2, strength: 60, radius: 100 });
    handles.push(h);
    for (const [x, y] of [
      [20, 12],
      [80, 12],
      [130, 12],
      [50, 0],
      [90, 30],
      [200, 20],
    ]) {
      move(x, y);
      checkContacts();
      tick(10);
      checkContacts();
    }
    window.dispatchEvent(new Event('blur'));
    tick(200);
    checkContacts();
    positions().forEach((p, i) => {
      expect(p.x).toBeCloseTo(i * 14 + 7, 2);
      expect(p.y).toBeCloseTo(12, 2);
    });
  });
  it('releases contact on pause and resumes without nested spans', () => {
    const h = obstaclePush(element);
    handles.push(h);
    move(60, 12);
    tick(20);
    h.pause();
    tick(220);
    positions().forEach((p, i) => expect(p.x).toBeCloseTo(i * 14 + 7, 2));
    h.resume();
    tick(20);
    checkContacts();
    expect(element.querySelectorAll('.wim-char .wim-char')).toHaveLength(0);
  });
});
it('the solid cursor touches live bounds and moves neighboring letters', () => {
  const h = obstaclePush(element, { cursorRadius: 15, easing: 0.2 });
  handles.push(h);
  move(63, 12);
  tick(30);
  checkContacts();
  const letters = positions();
  letters.forEach((p) => {
    const nearestX = Math.max(p.x - 7, Math.min(63, p.x + 7));
    const nearestY = Math.max(p.y - 12, Math.min(12, p.y + 12));
    expect(Math.hypot(nearestX - 63, nearestY - 12)).toBeGreaterThanOrEqual(14.98);
  });
  expect(
    letters.some((p, i) => Math.abs(i * 14 + 7 - 63) > 22 && Math.abs(p.x - (i * 14 + 7)) > 1)
  ).toBe(true);
});
it('high-strength push stays bounded without solid contact', () => {
  const h = push(element, { strength: 150, easing: 1, radius: 90 });
  handles.push(h);
  const home = positions();
  move(62, 12);
  const letters = positions();
  expect(letters).not.toEqual(home);
  expect(hasOverlap()).toBe(true);
  letters.forEach((p, i) => expect(Math.abs(p.x - home[i].x)).toBeLessThanOrEqual(150));
  window.dispatchEvent(new Event('blur'));
  tick();
  expect(positions()).toEqual(home);
});
it('rotation now reaches a quarter-turn by default and respects overrides', () => {
  const h = proximityRotate(element, { easing: 1 });
  handles.push(h);
  move(7, 12);
  expect(element.querySelector<HTMLElement>('.wim-char')!.style.transform).toContain(
    'rotate(90.00deg)'
  );
  h.destroy();
  const overridden = proximityRotate(element, {
    easing: 1,
    maxAngle: 135,
    direction: 'counter-clockwise',
  });
  handles.push(overridden);
  move(7, 12);
  expect(element.querySelector<HTMLElement>('.wim-char')!.style.transform).toContain(
    'rotate(-135.00deg)'
  );
});
