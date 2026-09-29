import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import {
  createDummyHandle,
  prefersReducedMotion,
  registerIntro,
  runAnimationWithTrigger,
  unregisterIntro,
} from '../core/motion';
import { splitWords } from '../core/split';
import { bounded, ownEffect, stopEffect } from '../core/effect';

export interface PixelResolveOptions extends BaseOptions {
  /** Largest pixel block in CSS pixels. Default is one fifth of the font size (4..24px). */
  pixelSize?: number;
  /** Resolution stages, 2..24. Defaults to 8. */
  steps?: number;
}

function runSingle(element: HTMLElement, options?: PixelResolveOptions): AnimationHandle {
  stopEffect(element);
  // Stop the previous intro before taking any DOM/style measurements.
  registerIntro(element, { cancel: () => {} });
  if (prefersReducedMotion() || !element.textContent?.trim()) {
    unregisterIntro(element);
    return createDummyHandle();
  }
  const initial = element.getBoundingClientRect();
  if (!initial.width || !initial.height || initial.width * initial.height > 4000000) {
    unregisterIntro(element);
    return createDummyHandle();
  }
  const source = document.createElement('canvas');
  const canvas = document.createElement('canvas');
  let context: CanvasRenderingContext2D | null;
  let output: CanvasRenderingContext2D | null;
  try {
    context = source.getContext('2d');
    output = canvas.getContext('2d');
  } catch {
    unregisterIntro(element);
    return createDummyHandle();
  }
  if (!context || !output) {
    unregisterIntro(element);
    return createDummyHandle();
  }
  const computed = getComputedStyle(element);
  // Unsupported vertical writing and transformed hosts retain the real text.
  if (
    (computed.writingMode && computed.writingMode !== 'horizontal-tb') ||
    (computed.transform && computed.transform !== 'none')
  ) {
    unregisterIntro(element);
    return createDummyHandle();
  }
  const position = element.style.position;
  const priority = element.style.getPropertyPriority('position');
  const { words, revert } = splitWords(element);
  if (!words.length) {
    revert();
    unregisterIntro(element);
    return createDummyHandle();
  }
  const box = element.getBoundingClientRect();
  const width = Math.ceil(element.clientWidth || box.width);
  const height = Math.ceil(element.clientHeight || box.height);
  source.width = width;
  source.height = height;
  // Use the browser's word positions, font and bidi shaping instead of guessing wrapping.
  for (const word of words) {
    const rect = word.getBoundingClientRect();
    const style = getComputedStyle(word);
    const fontSize = parseFloat(style.fontSize) || 16;
    context.font = `${style.fontStyle || 'normal'} ${style.fontWeight || '400'} ${fontSize}px ${style.fontFamily || 'sans-serif'}`;
    context.fillStyle = style.color;
    context.direction = style.direction === 'rtl' ? 'rtl' : 'ltr';
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    if ('letterSpacing' in context)
      context.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
    const raw = word.textContent || '';
    const text =
      style.textTransform === 'uppercase'
        ? raw.toLocaleUpperCase()
        : style.textTransform === 'lowercase'
          ? raw.toLocaleLowerCase()
          : raw;
    const metrics = context.measureText(text);
    const ascent = metrics.fontBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.fontBoundingBoxDescent || fontSize * 0.2;
    const baseline =
      rect.top - box.top - element.clientTop + (rect.height - ascent - descent) / 2 + ascent;
    context.fillText(text, rect.left - box.left - element.clientLeft, baseline);
  }
  canvas.className = 'wim-pixel-resolve';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: `${width}px`,
    height: `${height}px`,
    imageRendering: 'pixelated',
    pointerEvents: 'none',
  });
  if (computed.position === 'static' || !computed.position) element.style.position = 'relative';
  const block = bounded(
    options?.pixelSize,
    Math.min(24, Math.max(4, (parseFloat(computed.fontSize) || 48) / 5)),
    2,
    64
  );
  const steps = Math.round(bounded(options?.steps, 8, 2, 24));
  const duration = bounded(options?.duration, 1600, 10, 60000);
  const delay = bounded(options?.delay, 0, 0, 60000);
  let raf = 0;
  let done = false;
  let lastStep = -1;
  let release = () => {};
  let resolve!: () => void;
  const finished = new Promise<void>((r) => {
    resolve = r;
  });
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let observer: ResizeObserver | undefined;
  const cancel = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    observer?.disconnect();
    window.removeEventListener('resize', cancel);
    media?.removeEventListener?.('change', preference);
    document.fonts?.removeEventListener?.('loadingdone', cancel);
    canvas.remove();
    revert();
    if (position) element.style.setProperty('position', position, priority);
    else element.style.removeProperty('position');
    unregisterIntro(element);
    release();
    resolve();
  };
  const preference = () => {
    if (media?.matches) cancel();
  };
  registerIntro(element, { cancel });
  release = ownEffect(element, cancel);
  const started = performance.now();
  const tick = (now: number) => {
    if (done) return;
    if (!element.isConnected) {
      cancel();
      return;
    }
    const elapsed = now - started - delay;
    if (elapsed >= duration) {
      cancel();
      return;
    }
    if (elapsed >= 0) {
      const step = Math.min(steps - 1, Math.floor((elapsed / duration) * steps));
      if (step !== lastStep) {
        lastStep = step;
        // Geometric refinement makes every stage perceptibly denser: 16, 8, 4, 2, 1.
        const size = Math.max(1, block ** (1 - step / (steps - 1)));
        canvas.width = Math.max(1, Math.ceil(width / size));
        canvas.height = Math.max(1, Math.ceil(height / size));
        output!.imageSmoothingEnabled = true;
        output!.clearRect(0, 0, canvas.width, canvas.height);
        output!.drawImage(source, 0, 0, canvas.width, canvas.height);
        if (!canvas.parentNode) {
          words.forEach((word) => {
            word.style.opacity = '0';
          });
          element.append(canvas);
        }
      }
    }
    raf = requestAnimationFrame(tick);
  };
  window.addEventListener('resize', cancel);
  media?.addEventListener?.('change', preference);
  document.fonts?.addEventListener?.('loadingdone', cancel);
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => {
      const current = element.getBoundingClientRect();
      if (Math.abs(current.width - box.width) > 0.5 || Math.abs(current.height - box.height) > 0.5)
        cancel();
    });
    observer.observe(element);
  }
  tick(started);
  return { finished, cancel };
}

/** Coarse blocks of the actual text refine into a progressively denser pixel grid. */
export function pixelResolve(target: Target, options?: PixelResolveOptions): AnimationHandle {
  return runAnimationWithTrigger(target, options, runSingle, 'intro');
}
