import { describe, it, expect, beforeEach } from 'vitest';
import { blackHole } from '../../src/outro/blackHole';
import { paperCut } from '../../src/outro/paperCut';
import { portal } from '../../src/outro/portal';
import { breakAndFade } from '../../src/outro/breakAndFade';
import { portalReverse } from '../../src/outro/portalReverse';

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

  it('portal creates handle and cancels cleanly', () => {
    const handle = portal(container, { direction: 'vanishing-point' });
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

  it('portalReverse creates handle and cancels cleanly', () => {
    const handle = portalReverse(container);
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });
});
