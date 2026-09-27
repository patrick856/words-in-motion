import { describe, it, expect, beforeEach } from 'vitest';
import { pull } from '../../src/interact/pull';
import { push } from '../../src/interact/push';
import { proximityFade } from '../../src/interact/proximityFade';
import { proximityFlip } from '../../src/interact/proximityFlip';
import { proximityShake } from '../../src/interact/proximityShake';
import { obstaclePush } from '../../src/interact/obstaclePush';
import { fontWeight } from '../../src/interact/fontWeight';
import { accentColor } from '../../src/interact/accentColor';

describe('Interact / Cursor Effects', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.textContent = 'Cursor Reactive Kinetic Text';
    document.body.appendChild(container);
  });

  it('pull creates interact handle and destroys cleanly', () => {
    const handle = pull(container);
    expect(typeof handle.destroy).toBe('function');
    handle.destroy();
  });

  it('push creates interact handle and destroys cleanly', () => {
    const handle = push(container);
    expect(typeof handle.destroy).toBe('function');
    handle.destroy();
  });

  it('proximityFade creates interact handle and destroys cleanly', () => {
    const handle = proximityFade(container);
    expect(typeof handle.destroy).toBe('function');
    handle.destroy();
  });

  it('proximityFlip creates interact handle and destroys cleanly', () => {
    const handle = proximityFlip(container);
    expect(typeof handle.destroy).toBe('function');
    handle.destroy();
  });

  it('proximityShake creates interact handle and destroys cleanly', () => {
    const handle = proximityShake(container);
    expect(typeof handle.destroy).toBe('function');
    handle.destroy();
  });

  it('obstaclePush creates interact handle and destroys cleanly', () => {
    const handle = obstaclePush(container);
    expect(typeof handle.destroy).toBe('function');
    handle.destroy();
  });

  it('fontWeight creates interact handle and destroys cleanly', () => {
    const handle = fontWeight(container);
    expect(typeof handle.destroy).toBe('function');
    handle.destroy();
  });

  it('accentColor creates interact handle and destroys cleanly', () => {
    const handle = accentColor(container);
    expect(typeof handle.destroy).toBe('function');
    handle.destroy();
  });
});
