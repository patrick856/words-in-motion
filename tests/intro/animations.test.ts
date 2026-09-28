import { describe, it, expect, beforeEach, vi } from 'vitest';
import { directionalReveal } from '../../src/intro/directionalReveal';
import { lampFlicker } from '../../src/intro/lampFlicker';
import { rise } from '../../src/intro/rise';
import { chunkedScramble } from '../../src/intro/chunkedScramble';
import { stripRealign } from '../../src/intro/stripRealign';
import { normalizeDuration } from '../../src/core/motion';

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

  it('directionalReveal uses clipped frames and movement-only character reveals', () => {
    const animateSpy = vi.spyOn(Element.prototype, 'animate');
    const handle = directionalReveal(container);
    const [keyframes, timing] = animateSpy.mock.calls[0] as [Keyframe[], KeyframeAnimationOptions];

    expect(container.querySelectorAll('.wim-directional-frame')).toHaveLength('Words in Motion Intro'.replace(/\s/g, '').length);
    expect(keyframes[0].opacity).toBeUndefined();
    expect(keyframes[1].opacity).toBeUndefined();
    expect(keyframes[0].transform).toMatch(/^translate3d\((?:-115%|115%|0), (?:-115%|115%|0), 0\)$/);
    expect(timing.fill).toBe('both');

    handle.cancel();
    animateSpy.mockRestore();
  });

  it('lampFlicker creates animation handle and cancels cleanly', () => {
    const handle = lampFlicker(container, { flickers: 3 });
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });

  it('lampFlicker uses irregular timing and ends with rapid settling flicks', () => {
    const animateSpy = vi.spyOn(Element.prototype, 'animate');
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.2);

    const handle = lampFlicker(container, { flickers: 3 });
    const keyframes = animateSpy.mock.calls[0][0] as Keyframe[];
    const offsets = keyframes.map((frame) => Number(frame.offset));
    const gaps = offsets.slice(1).map((offset, index) => offset - offsets[index]);

    expect(offsets[0]).toBe(0);
    expect(offsets.at(-1)).toBe(1);
    expect(offsets.every((offset, index) => index === 0 || offset > offsets[index - 1])).toBe(true);
    expect(new Set(gaps.map((gap) => gap.toFixed(4))).size).toBeGreaterThan(2);
    expect(offsets.filter((offset) => offset >= 0.84 && offset < 1)).toHaveLength(4);

    handle.cancel();
    randomSpy.mockRestore();
    animateSpy.mockRestore();
  });

  it('rise creates animation handle and cancels cleanly', () => {
    const handle = rise(container, { from: 'ceiling' });
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });

  it('rise animates explicit text lines together by default', () => {
    container.style.whiteSpace = 'pre-line';
    container.textContent = 'First line\nSecond line';
    const animateSpy = vi.spyOn(Element.prototype, 'animate');

    const handle = rise(container);

    expect(animateSpy).toHaveBeenCalledTimes(2);
    expect(container.querySelectorAll('.wim-line-mask')).toHaveLength(2);
    const masks = Array.from(container.querySelectorAll<HTMLElement>('.wim-line-mask'));
    expect(masks.every((mask) => mask.style.overflow === 'hidden')).toBe(true);

    handle.cancel();
    animateSpy.mockRestore();
  });

  it('chunkedScramble creates animation handle and cancels cleanly', () => {
    const handle = chunkedScramble(container, { chunkSize: 2 });
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });

  it('chunkedScramble completes full lifecycle including final chunk tail phase', async () => {
    container.textContent = 'Words move in strange ways';
    const handle = chunkedScramble(container, {
      chunkSize: 2,
      effectInterval: 25,
      travelDuration: 10,
      letterStagger: 5,
    });
    await expect(handle.finished).resolves.toBeUndefined();
    expect(container.textContent).toBe('Words move in strange ways');
  });

  it('chunkedScramble runs corruption and healing for single-chunk text', async () => {
    container.textContent = 'Hello';
    const handle = chunkedScramble(container, {
      chunkSize: 2,
      effectInterval: 25,
      travelDuration: 10,
      letterStagger: 5,
    });
    await expect(handle.finished).resolves.toBeUndefined();
    expect(container.textContent).toBe('Hello');
  });

  it('chunkedScramble defaults to revealBy: "lines" and groups words by rendered layout', async () => {
    container.textContent = 'Alpha bravo charlie delta echo foxtrot';

    const origGetBCR = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      if (this.classList && this.classList.contains('wim-word')) {
        const text = this.textContent || '';
        const isLine1 = ['Alpha', 'bravo', 'charlie'].includes(text);
        return {
          top: isLine1 ? 100 : 140,
          bottom: isLine1 ? 120 : 160,
          left: 0,
          right: 50,
          width: 50,
          height: 20,
          x: 0,
          y: isLine1 ? 100 : 140,
          toJSON: () => {},
        };
      }
      return origGetBCR.apply(this);
    };

    try {
      const handle = chunkedScramble(container, {
        duration: 100,
        chunkSize: 1, // should be ignored when revealBy is "lines"
      });
      await expect(handle.finished).resolves.toBeUndefined();
      expect(container.textContent).toBe('Alpha bravo charlie delta echo foxtrot');
    } finally {
      Element.prototype.getBoundingClientRect = origGetBCR;
    }
  });

  it('chunkedScramble respects revealBy: "chunks" and uses chunkSize', async () => {
    container.textContent = 'Alpha bravo charlie delta';
    const handle = chunkedScramble(container, {
      revealBy: 'chunks',
      chunkSize: 2,
      duration: 100,
    });
    await expect(handle.finished).resolves.toBeUndefined();
    expect(container.textContent).toBe('Alpha bravo charlie delta');
  });

  it('chunkedScramble in line mode groups multiline text separated by line breaks', async () => {
    container.style.whiteSpace = 'pre-line';
    container.textContent = 'Line One\nLine Two\nLine Three';
    const handle = chunkedScramble(container, {
      revealBy: 'lines',
      duration: 100,
    });
    await expect(handle.finished).resolves.toBeUndefined();
    expect(container.textContent).toBe('Line One\nLine Two\nLine Three');
  });

  it('stripRealign creates animation handle and cancels cleanly', () => {
    const handle = stripRealign(container, { strips: 4 });
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
  });

  it('stripRealign works seamlessly with multiline text', () => {
    container.textContent = 'Line One Text\nLine Two Text\nLine Three Text';
    const handle = stripRealign(container, { strips: 3 });
    expect(handle.finished).toBeInstanceOf(Promise);
    expect(typeof handle.cancel).toBe('function');
    handle.cancel();
    expect(container.textContent).toBe('Line One Text\nLine Two Text\nLine Three Text');
  });

  it('stripRealign supports independently animated word strips', () => {
    container.textContent = 'Words move independently';
    const animateSpy = vi.spyOn(Element.prototype, 'animate');

    const handle = stripRealign(container, { by: 'words', strips: 2 });

    expect(animateSpy).toHaveBeenCalledTimes(6);
    expect(container.querySelectorAll('.wim-word')).toHaveLength(3);
    handle.cancel();
    expect(container.textContent).toBe('Words move independently');
    animateSpy.mockRestore();
  });

  describe('Duration scaling and configuration', () => {
    it('directionalReveal scales unit duration and stagger proportionally from duration', () => {
      const animateSpy = vi.spyOn(Element.prototype, 'animate');
      const handle = directionalReveal(container, {
        duration: 450,
        dropIn: false,
        by: 'words',
      });
      // DEFAULT_DURATION = 900 -> timingScale = 0.5.
      // actualUnitDuration = 600 * 0.5 = 300.
      // actualStagger = 40 * 0.5 = 20.
      expect(animateSpy).toHaveBeenCalled();
      const calls = animateSpy.mock.calls;
      const firstCallOpt = calls[0][1] as KeyframeAnimationOptions;
      expect(firstCallOpt.duration).toBe(300);
      expect(firstCallOpt.delay).toBe(0);
      if (calls.length > 1) {
        const secondCallOpt = calls[1][1] as KeyframeAnimationOptions;
        expect(secondCallOpt.duration).toBe(300);
        expect(Number(secondCallOpt.delay)).toBeGreaterThanOrEqual(12);
        expect(Number(secondCallOpt.delay)).toBeLessThanOrEqual(42);
      }
      handle.cancel();
      animateSpy.mockRestore();
    });

    it('directionalReveal allows explicit stagger and settleDuration overrides', () => {
      const animateSpy = vi.spyOn(Element.prototype, 'animate');
      const handle = directionalReveal(container, {
        duration: 450,
        stagger: 15,
        dropIn: false,
        by: 'words',
      });
      const calls = animateSpy.mock.calls;
      if (calls.length > 1) {
        const secondCallOpt = calls[1][1] as KeyframeAnimationOptions;
        expect(Number(secondCallOpt.delay)).toBeGreaterThanOrEqual(9);
        expect(Number(secondCallOpt.delay)).toBeLessThanOrEqual(31.5);
      }
      handle.cancel();
      animateSpy.mockRestore();
    });

    it('lampFlicker scales duration and stagger proportionally', () => {
      const animateSpy = vi.spyOn(Element.prototype, 'animate');
      const handle = lampFlicker(container, {
        duration: 600,
        by: 'words',
      });
      // DEFAULT_DURATION = 1200 -> timingScale = 0.5.
      // duration = 600, actualStagger = 50 * 0.5 = 25.
      expect(animateSpy).toHaveBeenCalled();
      const calls = animateSpy.mock.calls;
      const firstCallOpt = calls[0][1] as KeyframeAnimationOptions;
      expect(firstCallOpt.duration).toBe(600);
      expect(firstCallOpt.delay).toBe(0);
      if (calls.length > 1) {
        const secondCallOpt = calls[1][1] as KeyframeAnimationOptions;
        expect(secondCallOpt.duration).toBe(600);
        expect(secondCallOpt.delay).toBe(25);
      }
      handle.cancel();
      animateSpy.mockRestore();
    });

    it('rise scales duration and stagger proportionally', () => {
      const animateSpy = vi.spyOn(Element.prototype, 'animate');
      const handle = rise(container, {
        duration: 400,
        by: 'words',
      });
      // DEFAULT_DURATION = 800 -> timingScale = 0.5.
      // duration = 400, actualStagger = 30 * 0.5 = 15.
      expect(animateSpy).toHaveBeenCalled();
      const calls = animateSpy.mock.calls;
      const firstCallOpt = calls[0][1] as KeyframeAnimationOptions;
      expect(firstCallOpt.duration).toBe(400);
      expect(firstCallOpt.delay).toBe(0);
      if (calls.length > 1) {
        const secondCallOpt = calls[1][1] as KeyframeAnimationOptions;
        expect(secondCallOpt.duration).toBe(400);
        expect(secondCallOpt.delay).toBe(15);
      }
      handle.cancel();
      animateSpy.mockRestore();
    });

    it('stripRealign scales strip duration and delays proportionally', () => {
      const animateSpy = vi.spyOn(Element.prototype, 'animate');
      const handle = stripRealign(container, {
        duration: 700,
        strips: 2,
      });
      // DEFAULT_DURATION = 1400 -> timingScale = 0.5.
      // Each strip uses a deliberately varied duration: 700 * (0.55 .. 1.35).
      expect(animateSpy).toHaveBeenCalled();
      const calls = animateSpy.mock.calls;
      for (const call of calls) {
        const opt = call[1] as KeyframeAnimationOptions;
        expect(Number(opt.duration)).toBeGreaterThanOrEqual(700 * 0.54);
        expect(Number(opt.duration)).toBeLessThanOrEqual(700 * 1.36);
        expect(Number(opt.delay)).toBeLessThanOrEqual(60);
      }
      handle.cancel();
      animateSpy.mockRestore();
    });

    it('chunkedScramble scales fast with duration and completes lifecycle', async () => {
      container.textContent = 'Rapid chunk test';
      const handle = chunkedScramble(container, {
        duration: 80,
      });
      await expect(handle.finished).resolves.toBeUndefined();
      expect(container.textContent).toBe('Rapid chunk test');
    });

    it('chunkedScramble respects explicit travelDuration alongside duration', async () => {
      const handle = chunkedScramble(container, {
        duration: 80,
        travelDuration: 15,
        letterStagger: 5,
      });
      await expect(handle.finished).resolves.toBeUndefined();
    });

    it('safely handles non-positive and invalid duration values with fallback', () => {
      const d1 = directionalReveal(container, { duration: -100 });
      expect(typeof d1.cancel).toBe('function');
      d1.cancel();

      const d2 = lampFlicker(container, { duration: NaN });
      expect(typeof d2.cancel).toBe('function');
      d2.cancel();

      const d3 = rise(container, { duration: 0 });
      expect(typeof d3.cancel).toBe('function');
      d3.cancel();

      const d4 = stripRealign(container, { duration: -500 });
      expect(typeof d4.cancel).toBe('function');
      d4.cancel();

      const d5 = chunkedScramble(container, { duration: -200 });
      expect(typeof d5.cancel).toBe('function');
      d5.cancel();
    });
  });

  describe('normalizeDuration', () => {
    it('returns default value when duration is undefined, non-number, NaN, or non-finite', () => {
      expect(normalizeDuration(undefined, 900)).toBe(900);
      expect(normalizeDuration('500' as unknown as number, 900)).toBe(900);
      expect(normalizeDuration(NaN, 900)).toBe(900);
      expect(normalizeDuration(Infinity, 900)).toBe(900);
      expect(normalizeDuration(-Infinity, 900)).toBe(900);
    });

    it('returns default value when duration is <= 0', () => {
      expect(normalizeDuration(0, 900)).toBe(900);
      expect(normalizeDuration(-100, 900)).toBe(900);
    });

    it('clamps valid tiny durations to safe minimum of 10ms', () => {
      expect(normalizeDuration(1, 900)).toBe(10);
      expect(normalizeDuration(9, 900)).toBe(10);
    });

    it('preserves valid positive duration values >= 10ms', () => {
      expect(normalizeDuration(500, 900)).toBe(500);
      expect(normalizeDuration(1200, 900)).toBe(1200);
    });
  });
});
