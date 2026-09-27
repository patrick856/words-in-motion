import { describe, it, expect, beforeEach } from 'vitest';
import { directionalReveal } from '../../src/intro/directionalReveal';
import { lampFlicker } from '../../src/intro/lampFlicker';
import { rise } from '../../src/intro/rise';
import { chunkedScramble } from '../../src/intro/chunkedScramble';
import { stripRealign } from '../../src/intro/stripRealign';

describe('Intro Animations', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.textContent = 'Words in Motion Intro';
    document.body.appendChild(container);
  });

  it('directionalReveal creates animation handle and cancels cleanly', () => {
    const handle = directionalReveal(container, { direction: 'center-out', dropIn: true });
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });

  it('lampFlicker creates animation handle and cancels cleanly', () => {
    const handle = lampFlicker(container, { flickers: 3 });
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });

  it('rise creates animation handle and cancels cleanly', () => {
    const handle = rise(container, { from: 'ceiling' });
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });

  it('chunkedScramble creates animation handle and cancels cleanly', () => {
    const handle = chunkedScramble(container, { chunkSize: 2 });
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });

  it('stripRealign creates animation handle and cancels cleanly', () => {
    const handle = stripRealign(container, { strips: 4 });
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });
});
