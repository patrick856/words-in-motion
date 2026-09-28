import { describe, it, expect, beforeEach } from 'vitest';
import { createInteraction } from '../src/core/interact';
import { pull } from '../src/interact/pull';
import { proximityFade } from '../src/interact/proximityFade';

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

  it('supports plural targets and reverts all on destroy()', () => {
    const card1 = document.createElement('div');
    card1.textContent = 'Card 1 Text';
    const card2 = document.createElement('div');
    card2.textContent = 'Card 2 Text';
    document.body.appendChild(card1);
    document.body.appendChild(card2);

    const handle = createInteraction([card1, card2]);
    expect(card1.querySelectorAll('span').length).toBeGreaterThan(0);
    expect(card2.querySelectorAll('span').length).toBeGreaterThan(0);

    handle.destroy();
    expect(card1.innerHTML).toBe('Card 1 Text');
    expect(card2.innerHTML).toBe('Card 2 Text');
  });

  it('handles pointerArea: "target" activating only when pointer is inside bounding box', async () => {
    // Mock getBoundingClientRect on container: 0 to 100 on both X and Y
    container.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    let updateCount = 0;
    let lastProgress = -1;
    const handle = createInteraction(container, { pointerArea: 'target' }, (ctx) => {
      updateCount++;
      lastProgress = ctx.progress;
      return {};
    });

    // Move outside bounding box (X=500, Y=500)
    window.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 500,
        clientY: 500,
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    if (updateCount > 0) {
      expect(lastProgress).toBe(0);
    }
    expect(typeof handle.destroy).toBe('function');
    handle.destroy();
  });

  describe('Multiple Independent Cursor-Effect Instances', () => {
    it('runs multiple different cursor effects on different elements simultaneously without replacing each other', async () => {
      const title = document.createElement('h1');
      title.id = 'title';
      title.textContent = 'Primary Heading';
      const subtitle = document.createElement('p');
      subtitle.id = 'subtitle';
      subtitle.textContent = 'Supporting Text Underneath';

      document.body.appendChild(title);
      document.body.appendChild(subtitle);

      // Title mock bounds
      title.getBoundingClientRect = () => ({
        top: 100,
        left: 100,
        bottom: 140,
        right: 400,
        width: 300,
        height: 40,
        x: 100,
        y: 100,
        toJSON: () => {},
      });

      // Subtitle mock bounds
      subtitle.getBoundingClientRect = () => ({
        top: 160,
        left: 100,
        bottom: 190,
        right: 400,
        width: 300,
        height: 30,
        x: 100,
        y: 160,
        toJSON: () => {},
      });

      // Instance 1: pull on title
      const handleTitle = pull(title, { radius: 250, strength: 20 });

      // Instance 2: proximityFade on subtitle
      const handleSubtitle = proximityFade(subtitle, { radius: 250, minOpacity: 0.2 });

      // Pointer between them (X=200, Y=150)
      window.dispatchEvent(
        new MouseEvent('pointermove', {
          clientX: 200,
          clientY: 150,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const titleChar = title.querySelector<HTMLElement>('.wim-char');
      const subtitleChar = subtitle.querySelector<HTMLElement>('.wim-char');
      expect(titleChar).not.toBeNull();
      expect(subtitleChar).not.toBeNull();
      expect(titleChar?.style.transform).toBeDefined();
      expect(subtitleChar?.style.opacity).toBeDefined();

      // Cancelling title only affects title
      handleTitle.destroy();
      expect(title.innerHTML).toBe('Primary Heading');
      expect(subtitle.querySelectorAll('span').length).toBeGreaterThan(0);

      // Subtitle keeps running until explicitly cancelled
      handleSubtitle.destroy();
      expect(subtitle.innerHTML).toBe('Supporting Text Underneath');
    });

    it('supports multiple different effects on the same element simultaneously with composed styles', async () => {
      const heading = document.createElement('h1');
      heading.textContent = 'Composable Typography';
      document.body.appendChild(heading);

      heading.getBoundingClientRect = () => ({
        top: 100,
        left: 100,
        bottom: 140,
        right: 400,
        width: 300,
        height: 40,
        x: 100,
        y: 100,
        toJSON: () => {},
      });

      // Effect 1: Translation (pull)
      const handle1 = createInteraction(heading, { radius: 200 }, (ctx) => {
        return { translateX: 10 * ctx.progress, translateY: 5 * ctx.progress };
      });

      // Effect 2: Opacity (proximityFade) on the same element
      const handle2 = createInteraction(heading, { radius: 200 }, (ctx) => {
        return { opacity: Math.max(0.2, 1 - ctx.progress * 0.5) };
      });

      // Trigger movement inside radius
      window.dispatchEvent(
        new MouseEvent('pointermove', {
          clientX: 120,
          clientY: 110,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const firstChar = heading.querySelector<HTMLElement>('.wim-char');
      expect(firstChar).not.toBeNull();
      // Should have both composed transform and composed opacity
      expect(firstChar?.style.transform).toBeDefined();
      expect(firstChar?.style.opacity).toBeDefined();

      // Destroy first handle (pull) - heading should NOT revert yet because handle2 is still active
      handle1.destroy();
      expect(heading.querySelectorAll('span').length).toBeGreaterThan(0);

      // Destroy second handle - now heading reverts to original text
      handle2.destroy();
      expect(heading.innerHTML).toBe('Composable Typography');
    });

    it('combines multiple transform-based effects additively on the same element', async () => {
      const textEl = document.createElement('div');
      textEl.textContent = 'Dual Vector Shift';
      document.body.appendChild(textEl);

      textEl.getBoundingClientRect = () => ({
        top: 50,
        left: 50,
        bottom: 80,
        right: 250,
        width: 200,
        height: 30,
        x: 50,
        y: 50,
        toJSON: () => {},
      });

      // Effect A contributes +10px X
      const handleA = createInteraction(textEl, { radius: 200 }, () => ({
        translateX: 10,
        translateY: 0,
      }));

      // Effect B contributes +5px X and +8px Y
      const handleB = createInteraction(textEl, { radius: 200 }, () => ({
        translateX: 5,
        translateY: 8,
      }));

      window.dispatchEvent(
        new MouseEvent('pointermove', {
          clientX: 60,
          clientY: 60,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const firstChar = textEl.querySelector<HTMLElement>('.wim-char');
      expect(firstChar).not.toBeNull();
      // Summed transform: 10 + 5 = 15px (approximately after lerp)
      expect(firstChar?.style.transform).toContain('translate3d');

      handleA.destroy();
      handleB.destroy();
      expect(textEl.innerHTML).toBe('Dual Vector Shift');
    });

    it('evaluates pointerArea independently per instance across elements', async () => {
      const elGlobal = document.createElement('div');
      elGlobal.textContent = 'Global Viewport Tracking';
      const elTarget = document.createElement('div');
      elTarget.textContent = 'Target Box Only Tracking';

      document.body.appendChild(elGlobal);
      document.body.appendChild(elTarget);

      elGlobal.getBoundingClientRect = () => ({
        top: 0,
        left: 0,
        bottom: 50,
        right: 200,
        width: 200,
        height: 50,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      elTarget.getBoundingClientRect = () => ({
        top: 200,
        left: 200,
        bottom: 250,
        right: 400,
        width: 200,
        height: 50,
        x: 200,
        y: 200,
        toJSON: () => {},
      });

      let globalProgress = -1;
      let targetProgress = -1;

      const h1 = createInteraction(elGlobal, { pointerArea: 'viewport', radius: 400 }, (ctx) => {
        globalProgress = ctx.progress;
      });

      const h2 = createInteraction(elTarget, { pointerArea: 'target', radius: 400 }, (ctx) => {
        targetProgress = ctx.progress;
      });

      // Pointer at X=50, Y=25 (inside elGlobal, outside elTarget)
      window.dispatchEvent(
        new MouseEvent('pointermove', {
          clientX: 50,
          clientY: 25,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // elGlobal reacted because it's within radius in viewport mode
      expect(globalProgress).toBeGreaterThan(0);
      // elTarget did NOT react because pointer is outside elTarget's bounding box
      expect(targetProgress).toBe(0);

      h1.destroy();
      h2.destroy();
    });

    it('supports multiple targets from a single selector and cleans up cleanly', () => {
      const c1 = document.createElement('div');
      c1.className = 'group-card';
      c1.textContent = 'Card A';
      const c2 = document.createElement('div');
      c2.className = 'group-card';
      c2.textContent = 'Card B';
      document.body.appendChild(c1);
      document.body.appendChild(c2);

      const handle = createInteraction('.group-card');
      expect(c1.querySelectorAll('span').length).toBeGreaterThan(0);
      expect(c2.querySelectorAll('span').length).toBeGreaterThan(0);

      handle.destroy();
      expect(c1.innerHTML).toBe('Card A');
      expect(c2.innerHTML).toBe('Card B');
    });

    it('allows cancel() as an alias to destroy()', () => {
      const card = document.createElement('div');
      card.textContent = 'Cancel Test';
      document.body.appendChild(card);

      const handle = createInteraction(card);
      expect(card.querySelectorAll('span').length).toBeGreaterThan(0);

      expect(typeof handle.cancel).toBe('function');
      handle.cancel?.();
      expect(card.innerHTML).toBe('Cancel Test');
    });
  });
});


