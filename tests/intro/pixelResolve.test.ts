import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { pixelResolve } from '../../src/intro/pixelResolve';
let element: HTMLElement;
let frame: FrameRequestCallback;
let now: number;
let widths: number[];
beforeEach(() => {
  now = 0;
  widths = [];
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement
  ) {
    return {
      measureText: () => ({ fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 }),
      fillText: vi.fn(),
      clearRect: vi.fn(),
      drawImage: () => widths.push(this.width),
    } as unknown as CanvasRenderingContext2D;
  });
  element = document.createElement('div');
  element.innerHTML = 'Large <em>pixels</em><br>become text';
  element.style.fontSize = '40px';
  document.body.append(element);
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    width: 320,
    height: 100,
    top: 0,
    left: 0,
  } as DOMRect);
});
afterEach(() => {
  element.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const advance = (ms: number) => {
  now += ms;
  frame(now);
};
describe('pixelResolve', () => {
  it('starts coarse, increases grid density monotonically, then restores exact DOM', async () => {
    const original = element.innerHTML;
    const em = element.querySelector('em');
    const h = pixelResolve(element, { pixelSize: 16, duration: 800, steps: 8 });
    expect(widths[0]).toBe(20);
    for (let i = 0; i < 8; i++) advance(100);
    await h.finished;
    expect(widths.at(-1)).toBe(320);
    expect(widths.every((w, i) => i === 0 || w >= widths[i - 1])).toBe(true);
    expect(element.innerHTML).toBe(original);
    expect(element.querySelector('em')).toBe(em);
    expect(element.querySelector('canvas')).toBeNull();
  });
  it('honors delay, handles repeated calls, and cleans up on resize', async () => {
    const original = element.innerHTML;
    const first = pixelResolve(element, { delay: 200 });
    expect(element.querySelector('canvas')).toBeNull();
    advance(200);
    expect(element.querySelector('canvas')).not.toBeNull();
    const second = pixelResolve(element);
    await first.finished;
    first.cancel();
    expect(element.querySelector('canvas')).not.toBeNull();
    window.dispatchEvent(new Event('resize'));
    await second.finished;
    expect(element.innerHTML).toBe(original);
  });
  it('falls back to readable original text if canvas is unavailable', async () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    const original = element.innerHTML;
    await pixelResolve(element).finished;
    expect(element.innerHTML).toBe(original);
  });
});
