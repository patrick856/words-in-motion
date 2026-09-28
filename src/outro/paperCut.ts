import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { prefersReducedMotion, createDummyHandle, runAnimationWithTrigger } from '../core/motion';

export interface PaperCutOptions extends BaseOptions {
  /** Number of horizontal strips per line. Defaults to 4. */
  strips?: number;
  /** Maximum horizontal displacement in pixels. Defaults to 35. */
  maxOffset?: number;
  /** Whether to keep text hidden or restore original state after completion. Defaults to false. */
  keep?: boolean;
}

/**
 * Generates randomized puzzle-disassembly keyframes for a single horizontal strip.
 * The strip starts locked in place, unlatches at a randomized time interval, wiggles/shifts,
 * and slides outward into void as the puzzle comes apart.
 */
function generatePuzzleOutroKeyframes(maxOffset: number): Keyframe[] {
  const sign = Math.random() < 0.5 ? -1 : 1;
  const exitDist = Math.round(sign * (0.8 + Math.random() * 0.45) * maxOffset);

  // Randomized unlatch moment where the piece starts slipping
  const tUnlatch = 0.08 + Math.random() * 0.12;
  const pos3 = Math.round(-exitDist * (0.05 + Math.random() * 0.08));

  const t2 = tUnlatch + 0.16 + Math.random() * 0.08;
  const pos2 = Math.round(exitDist * (0.18 + Math.random() * 0.18));
  const t2Hold = Math.min(0.65, t2 + 0.06 + Math.random() * 0.05);

  const t1 = t2Hold + 0.14 + Math.random() * 0.08;
  const pos1 = Math.round(-exitDist * (0.45 + Math.random() * 0.25));

  return [
    { transform: 'translate3d(0, 0, 0)', opacity: 1, offset: 0 },
    { transform: 'translate3d(0, 0, 0)', opacity: 1, offset: Number(tUnlatch.toFixed(3)) },
    { transform: `translate3d(${pos3}px, 0, 0)`, opacity: 0.98, offset: Number((tUnlatch + 0.06).toFixed(3)) },
    { transform: `translate3d(${pos2}px, 0, 0)`, opacity: 0.92, offset: Number(t2.toFixed(3)) },
    { transform: `translate3d(${pos2}px, 0, 0)`, opacity: 0.92, offset: Number(t2Hold.toFixed(3)) },
    { transform: `translate3d(${pos1}px, 0, 0)`, opacity: 0.8, offset: Number(t1.toFixed(3)) },
    { transform: `translate3d(${exitDist}px, 0, 0)`, opacity: 0, offset: 1 },
  ];
}

function runSinglePaperCut(
  element: HTMLElement,
  options?: PaperCutOptions
): AnimationHandle {
  if (prefersReducedMotion()) {
    element.style.opacity = '0';
    return createDummyHandle();
  }

  const {
    strips = 4,
    maxOffset = 35,
    duration = 650,
    keep = false,
  } = options || {};

  const originalHTML = element.innerHTML;
  const originalAriaLabel = element.getAttribute('aria-label');
  const rawText = element.textContent || '';

  if (!rawText.trim()) {
    if (!keep) element.style.opacity = '0';
    return createDummyHandle();
  }

  if (!originalAriaLabel) {
    element.setAttribute('aria-label', rawText.trim());
  }

  const computed = window.getComputedStyle(element);

  // Split text by explicit paragraphs/newlines first, then detect soft wraps
  const rawParagraphs = rawText.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
  const lines: string[] = [];

  rawParagraphs.forEach((paragraphText) => {
    element.textContent = '';
    const words = paragraphText.split(/\s+/).filter(Boolean);
    if (words.length === 0) return;

    const spans: HTMLSpanElement[] = [];
    words.forEach((w, idx) => {
      const sp = document.createElement('span');
      sp.textContent = w;
      sp.style.display = 'inline';
      element.appendChild(sp);
      spans.push(sp);
      if (idx < words.length - 1) {
        element.appendChild(document.createTextNode(' '));
      }
    });

    const lineWordGroups: string[][] = [[]];
    let lastTop = spans[0]?.offsetTop ?? 0;
    spans.forEach((sp, idx) => {
      if (idx > 0 && sp.offsetTop > lastTop + 4) {
        lastTop = sp.offsetTop;
        lineWordGroups.push([words[idx]]);
      } else {
        lineWordGroups[lineWordGroups.length - 1].push(words[idx]);
      }
    });

    lineWordGroups.forEach((group) => {
      if (group.length > 0) {
        lines.push(group.join(' '));
      }
    });
  });

  if (lines.length === 0) {
    element.innerHTML = originalHTML;
    if (!keep) element.style.opacity = '0';
    return createDummyHandle();
  }

  // Measure exact pixel dimensions for each individual line
  const measureSpan = document.createElement('span');
  measureSpan.style.position = 'absolute';
  measureSpan.style.visibility = 'hidden';
  measureSpan.style.whiteSpace = 'nowrap';
  if (computed.font) measureSpan.style.font = computed.font;
  measureSpan.style.fontSize = computed.fontSize;
  measureSpan.style.fontFamily = computed.fontFamily;
  measureSpan.style.fontWeight = computed.fontWeight;
  measureSpan.style.fontStyle = computed.fontStyle;
  measureSpan.style.letterSpacing = computed.letterSpacing;
  measureSpan.style.lineHeight = computed.lineHeight;
  element.appendChild(measureSpan);

  const parsedLineHeight = parseFloat(computed.lineHeight);

  const lineMetrics = lines.map((lineText) => {
    measureSpan.textContent = lineText;
    const r = measureSpan.getBoundingClientRect();
    const height =
      !isNaN(parsedLineHeight) && parsedLineHeight > 0
        ? Math.ceil(parsedLineHeight)
        : Math.ceil(r.height || 36);
    return {
      text: lineText,
      width: Math.ceil(r.width) || element.offsetWidth || 300,
      height,
    };
  });
  element.removeChild(measureSpan);

  const originalStyle = {
    position: element.style.position,
    display: element.style.display,
    flexDirection: element.style.flexDirection,
    alignItems: element.style.alignItems,
    overflow: element.style.overflow,
  };

  element.textContent = '';
  element.style.position = 'relative';
  element.style.display = 'flex';
  element.style.flexDirection = 'column';
  element.style.overflow = 'hidden';
  element.style.alignItems =
    computed.textAlign === 'center'
      ? 'center'
      : computed.textAlign === 'right'
      ? 'flex-end'
      : 'flex-start';

  const animations: Animation[] = [];

  lineMetrics.forEach(({ text: lineText, width: lineW, height: lineH }) => {
    // Clipping display box for each line: strips exiting this box are not visible
    const lineContainer = document.createElement('div');
    lineContainer.style.position = 'relative';
    lineContainer.style.width = `${lineW}px`;
    lineContainer.style.height = `${lineH}px`;
    lineContainer.style.overflow = 'hidden';
    lineContainer.style.whiteSpace = 'nowrap';
    lineContainer.style.boxSizing = 'border-box';
    element.appendChild(lineContainer);

    const stripTops: number[] = [];
    const stripHeights: number[] = [];
    for (let i = 0; i < strips; i++) {
      const top = Math.round((i * lineH) / strips);
      const bottom = Math.round(((i + 1) * lineH) / strips);
      stripTops.push(top);
      stripHeights.push(Math.max(1, bottom - top));
    }

    for (let i = 0; i < strips; i++) {
      const stripWrapper = document.createElement('div');
      stripWrapper.style.position = 'absolute';
      stripWrapper.style.top = `${stripTops[i]}px`;
      stripWrapper.style.left = '0';
      stripWrapper.style.width = `${lineW}px`;
      stripWrapper.style.height = `${stripHeights[i]}px`;
      stripWrapper.style.overflow = 'hidden';
      stripWrapper.setAttribute('aria-hidden', 'true');

      const innerContent = document.createElement('div');
      innerContent.style.position = 'absolute';
      innerContent.style.top = `-${stripTops[i]}px`;
      innerContent.style.left = '0';
      innerContent.style.width = `${lineW}px`;
      innerContent.style.height = `${lineH}px`;
      if (computed.font) innerContent.style.font = computed.font;
      innerContent.style.fontSize = computed.fontSize;
      innerContent.style.fontFamily = computed.fontFamily;
      innerContent.style.fontWeight = computed.fontWeight;
      innerContent.style.fontStyle = computed.fontStyle;
      innerContent.style.letterSpacing = computed.letterSpacing;
      innerContent.style.lineHeight = `${lineH}px`;
      innerContent.style.color = computed.color;
      innerContent.style.whiteSpace = 'nowrap';
      innerContent.textContent = lineText;

      stripWrapper.appendChild(innerContent);
      lineContainer.appendChild(stripWrapper);

      // Randomized puzzle outro keyframes and time intervals per strip
      const keyframes = generatePuzzleOutroKeyframes(maxOffset);
      const stripDelay = Math.random() * 120;
      const stripDuration = duration * (0.8 + Math.random() * 0.4);

      if (typeof stripWrapper.animate === 'function') {
        const anim = stripWrapper.animate(keyframes, {
          duration: stripDuration,
          delay: stripDelay,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          fill: 'forwards',
        });
        animations.push(anim);
      }
    }
  });

  const revert = () => {
    element.innerHTML = originalHTML;
    element.style.position = originalStyle.position;
    element.style.display = originalStyle.display;
    element.style.flexDirection = originalStyle.flexDirection;
    element.style.alignItems = originalStyle.alignItems;
    element.style.overflow = originalStyle.overflow;
    if (originalAriaLabel === null) {
      element.removeAttribute('aria-label');
    } else {
      element.setAttribute('aria-label', originalAriaLabel);
    }
  };

  const finished = Promise.all(animations.map((a) => a.finished)).then(() => {
    if (!keep) {
      element.style.opacity = '0';
    }
    revert();
  });

  const cancel = () => {
    animations.forEach((a) => a.cancel());
    revert();
    element.style.opacity = '';
  };

  return { finished, cancel };
}

/**
 * Paper cut outro animation.
 * Slices each line of text into horizontal puzzle strips enclosed in display boxes so strips exiting the box are clipped.
 * Supports immediate execution or scroll-triggered ('enter' | 'leave') activation across one or multiple targets.
 */
export function paperCut(
  target: Target,
  options?: PaperCutOptions
): AnimationHandle {
  return runAnimationWithTrigger(target, options, runSinglePaperCut, 'outro');
}

