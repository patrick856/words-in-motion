import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveElements, runAnimationWithTrigger } from '../src/core/motion';

describe('Motion & Target Resolution (core/motion.ts)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('resolveElements', () => {
    it('resolves a single HTMLElement directly', () => {
      const el = document.createElement('div');
      const resolved = resolveElements(el);
      expect(resolved).toEqual([el]);
    });

    it('resolves multiple elements from a CSS class selector', () => {
      const el1 = document.createElement('div');
      el1.className = 'test-item';
      const el2 = document.createElement('div');
      el2.className = 'test-item';
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      const resolved = resolveElements('.test-item');
      expect(resolved).toHaveLength(2);
      expect(resolved[0]).toBe(el1);
      expect(resolved[1]).toBe(el2);
    });

    it('resolves an array of HTMLElements filtering out null/undefined', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('span');
      const resolved = resolveElements([el1, null, el2, undefined]);
      expect(resolved).toEqual([el1, el2]);
    });

    it('resolves a NodeList of HTMLElements', () => {
      const el1 = document.createElement('p');
      el1.className = 'p-node';
      const el2 = document.createElement('p');
      el2.className = 'p-node';
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      const nodeList = document.querySelectorAll<HTMLElement>('.p-node');
      const resolved = resolveElements(nodeList);
      expect(resolved).toHaveLength(2);
      expect(resolved[0]).toBe(el1);
      expect(resolved[1]).toBe(el2);
    });

    it('returns an empty array when selector matches nothing', () => {
      const resolved = resolveElements('.nonexistent-class');
      expect(resolved).toEqual([]);
    });
  });

  describe('runAnimationWithTrigger', () => {
    it('runs immediately when trigger is "immediate" (default) across multiple targets', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      const runSpy = vi.fn().mockImplementation(() => ({
        finished: Promise.resolve(),
        cancel: vi.fn(),
      }));

      const handle = runAnimationWithTrigger([el1, el2], { trigger: 'immediate' }, runSpy, 'intro');

      expect(runSpy).toHaveBeenCalledTimes(2);
      expect(runSpy).toHaveBeenCalledWith(el1, { trigger: 'immediate' });
      expect(runSpy).toHaveBeenCalledWith(el2, { trigger: 'immediate' });
      expect(handle.finished).toBeInstanceOf(Promise);
      expect(typeof handle.cancel).toBe('function');
    });

    it('pre-hides intro elements with opacity 0 when trigger is "enter"', () => {
      const el = document.createElement('div');
      el.style.opacity = '1';
      document.body.appendChild(el);

      // Place element below viewport threshold
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        top: 2000,
        bottom: 2050,
        height: 50,
        left: 0,
        right: 100,
        width: 100,
        y: 2000,
        x: 0,
        toJSON: () => {},
      });

      const runSpy = vi.fn().mockReturnValue({
        finished: Promise.resolve(),
        cancel: vi.fn(),
      });

      const handle = runAnimationWithTrigger(el, { trigger: 'enter' }, runSpy, 'intro');

      // Should be pre-hidden
      expect(el.style.opacity).toBe('0');
      // Runner not invoked yet because element is below trigger threshold
      expect(runSpy).not.toHaveBeenCalled();

      handle.cancel();
      expect(el.style.opacity).toBe('1');
    });

    it('cancels all target animation handles when cancel() is called', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      const cancelSpy1 = vi.fn();
      const cancelSpy2 = vi.fn();

      const runSpy = vi.fn()
        .mockReturnValueOnce({ finished: new Promise(() => {}), cancel: cancelSpy1 })
        .mockReturnValueOnce({ finished: new Promise(() => {}), cancel: cancelSpy2 });

      const handle = runAnimationWithTrigger([el1, el2], {}, runSpy, 'intro');

      handle.cancel();
      expect(cancelSpy1).toHaveBeenCalled();
      expect(cancelSpy2).toHaveBeenCalled();
    });
  });
});
