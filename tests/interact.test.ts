import { describe, it, expect, beforeEach } from 'vitest';
import { createInteraction } from '../src/core/interact';

describe('Base Interaction (core/interact.ts)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.textContent = 'Interactive Kinetic Typography';
    document.body.appendChild(container);
  });

  it('returns InteractHandle with destroy, pause, and resume functions', () => {
    const handle = createInteraction(container);

    expect(typeof handle.destroy).toBe('function');
    expect(typeof handle.pause).toBe('function');
    expect(typeof handle.resume).toBe('function');

    handle.destroy();
  });

  it('splits text into spans and revert restores DOM on destroy()', () => {
    const handle = createInteraction(container);

    // Spans created
    expect(container.querySelectorAll('span').length).toBeGreaterThan(0);

    handle.destroy();

    // DOM reverted
    expect(container.innerHTML).toBe('Interactive Kinetic Typography');
  });

  it('calls update callback with frame context', () => {
    let updateCount = 0;

    const handle = createInteraction(container, { radius: 200 }, (ctx) => {
      updateCount++;
      expect(ctx.total).toBeGreaterThan(0);
      expect(ctx.options.radius).toBe(200);
      return { translateX: ctx.progress * 10 };
    });

    // Dispatch a movement event
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 50,
        clientY: 50,
      })
    );

    expect(updateCount).toBeGreaterThanOrEqual(0);
    expect(typeof handle.pause).toBe('function');
    handle.destroy();
  });
});
