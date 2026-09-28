import { describe, it, expect, beforeEach } from 'vitest';
import { blackHole } from '../../src/outro/blackHole';
import { paperCut } from '../../src/outro/paperCut';
import { hingeDrop } from '../../src/outro/hingeDrop';
import { breakAndFade } from '../../src/outro/breakAndFade';

describe('Outro Animations', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.textContent = 'Words in Motion Outro';
    document.body.appendChild(container);
  });

  it('blackHole creates handle and cancels cleanly', () => {
    const handle = blackHole(container);
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });

  it('paperCut creates handle and cancels cleanly', () => {
    const handle = paperCut(container, { strips: 4 });
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });

  it('paperCut works seamlessly with multiline text', () => {
    container.textContent = 'Line One Outro\nLine Two Outro\nLine Three Outro';
    const handle = paperCut(container, { strips: 3 });
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
    expect(container.textContent).toBe('Line One Outro\nLine Two Outro\nLine Three Outro');
  });

  it('hingeDrop creates handle and cancels cleanly', () => {
    const handle = hingeDrop(container);
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });

  it('breakAndFade creates handle and cancels cleanly', () => {
    const handle = breakAndFade(container);
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });
});
