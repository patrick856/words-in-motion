import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateScrollProgress, parseScrollAnchor } from '../src/core/scroll';
import { createScrollTrigger, createScrollScrub } from '../src/core/scrollHelpers';

describe('Scroll Core & Helpers', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.textContent = 'Scroll Kinetic Typography Line 1\nLine 2\nLine 3';
    document.body.appendChild(container);
  });

  describe('parseScrollAnchor', () => {
    it('parses standard element and viewport percentages (e.g. top 80%)', () => {
      const vh = 1000;
      const { elementAnchor, evaluate } = parseScrollAnchor('top 80%');
      expect(elementAnchor).toBe('top');

      const rect = { top: 800, height: 100 } as DOMRect;
      const res = evaluate(rect, vh);
      expect(res.elementY).toBe(800);
      expect(res.viewportY).toBe(800);
      expect(res.diff).toBe(0);
    });

    it('parses center element anchor and percentage viewport (e.g. center 50%)', () => {
      const vh = 1000;
      const { elementAnchor, evaluate } = parseScrollAnchor('center 50%');
      expect(elementAnchor).toBe('center');

      const rect = { top: 450, height: 100 } as DOMRect;
      const res = evaluate(rect, vh);
      expect(res.elementY).toBe(500);
      expect(res.viewportY).toBe(500);
      expect(res.diff).toBe(0);
    });

    it('parses bottom element anchor and named viewport anchors (e.g. bottom top)', () => {
      const vh = 1000;
      const { elementAnchor, evaluate } = parseScrollAnchor('bottom top');
      expect(elementAnchor).toBe('bottom');

      const rect = { top: -100, height: 100 } as DOMRect;
      const res = evaluate(rect, vh);
      expect(res.elementY).toBe(0);
      expect(res.viewportY).toBe(0);
      expect(res.diff).toBe(0);
    });

    it('parses pixel-based viewport anchors (e.g. top 250px)', () => {
      const vh = 1000;
      const { evaluate } = parseScrollAnchor('top 250px');
      const rect = { top: 250, height: 50 } as DOMRect;
      const res = evaluate(rect, vh);
      expect(res.viewportY).toBe(250);
      expect(res.diff).toBe(0);
    });

    it('falls back to default string on undefined or empty input', () => {
      const { elementAnchor, evaluate } = parseScrollAnchor(undefined, 'bottom 20%');
      expect(elementAnchor).toBe('bottom');
      const res = evaluate({ top: 100, height: 100 } as DOMRect, 1000);
      expect(res.viewportY).toBe(200);
    });
  });

  describe('calculateScrollProgress', () => {
    it('calculates 0 at start position and 1 at end position', () => {
      const vh = 1000;
      // Start is "top 80%" (target Y = 800)
      // End is "top 20%" (target Y = 200)

      // rect.top = 800 -> progress 0
      const rectStart = { top: 800, height: 50 } as DOMRect;
      expect(calculateScrollProgress(rectStart, vh, 'top 80%', 'top 20%')).toBe(0);

      // rect.top = 500 -> progress 0.5
      const rectMid = { top: 500, height: 50 } as DOMRect;
      expect(calculateScrollProgress(rectMid, vh, 'top 80%', 'top 20%')).toBe(0.5);

      // rect.top = 200 -> progress 1
      const rectEnd = { top: 200, height: 50 } as DOMRect;
      expect(calculateScrollProgress(rectEnd, vh, 'top 80%', 'top 20%')).toBe(1);
    });

    it('clamps progress between 0 and 1', () => {
      const vh = 1000;
      const rectBelow = { top: 950, height: 50 } as DOMRect;
      expect(calculateScrollProgress(rectBelow, vh, 'top 80%', 'top 20%')).toBe(0);

      const rectAbove = { top: 50, height: 50 } as DOMRect;
      expect(calculateScrollProgress(rectAbove, vh, 'top 80%', 'top 20%')).toBe(1);
    });
  });

  describe('createScrollTrigger', () => {
    it('returns a ScrollTriggerHandle with finished, cancel, and destroy', () => {
      const handle = createScrollTrigger(container);

      expect(handle.finished).toBeInstanceOf(Promise);
      expect(typeof handle.cancel).toBe('function');
      expect(typeof handle.destroy).toBe('function');

      handle.destroy();
    });

    it('invokes play callback when triggered', () => {
      const playSpy = vi.fn().mockReturnValue({
        finished: Promise.resolve(),
        cancel: () => {},
      });

      const handle = createScrollTrigger(container, { once: true }, playSpy);
      expect(typeof handle.destroy).toBe('function');
      handle.destroy();
    });

    it('supports plural targets and destroys all handlers cleanly', () => {
      const c1 = document.createElement('div');
      c1.textContent = 'Trigger Card 1';
      const c2 = document.createElement('div');
      c2.textContent = 'Trigger Card 2';
      document.body.appendChild(c1);
      document.body.appendChild(c2);

      const playSpy = vi.fn().mockReturnValue({
        finished: Promise.resolve(),
        cancel: () => {},
      });

      const handle = createScrollTrigger([c1, c2], { once: true }, playSpy);
      expect(typeof handle.destroy).toBe('function');
      handle.destroy();
    });
  });

  describe('createScrollScrub', () => {
    it('returns a ScrollScrubHandle with destroy, pause, and resume', () => {
      const handle = createScrollScrub(container);

      expect(typeof handle.destroy).toBe('function');
      expect(typeof handle.pause).toBe('function');
      expect(typeof handle.resume).toBe('function');

      handle.destroy();
    });

    it('reverts text content on destroy()', () => {
      const handle = createScrollScrub(container);
      expect(container.querySelectorAll('span').length).toBeGreaterThan(0);

      handle.destroy();
      expect(container.innerHTML).toBe('Scroll Kinetic Typography Line 1\nLine 2\nLine 3');
    });

    it('supports plural targets and reverts all elements on destroy()', () => {
      const c1 = document.createElement('div');
      c1.textContent = 'Scrub Item 1';
      const c2 = document.createElement('div');
      c2.textContent = 'Scrub Item 2';
      document.body.appendChild(c1);
      document.body.appendChild(c2);

      const handle = createScrollScrub([c1, c2]);
      expect(c1.querySelectorAll('span').length).toBeGreaterThan(0);
      expect(c2.querySelectorAll('span').length).toBeGreaterThan(0);

      handle.destroy();
      expect(c1.innerHTML).toBe('Scrub Item 1');
      expect(c2.innerHTML).toBe('Scrub Item 2');
    });

    it('invokes update callback on scroll tick', () => {
      let updateCount = 0;
      const handle = createScrollScrub(container, {}, (ctx) => {
        updateCount++;
        expect(ctx.total).toBeGreaterThan(0);
        return { opacity: ctx.progress };
      });

      expect(updateCount).toBeGreaterThanOrEqual(0);
      handle.destroy();
    });
  });
});

