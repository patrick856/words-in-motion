import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { prefersReducedMotion, createDummyHandle, registerIntro, unregisterIntro, normalizeDuration, runAnimationWithTrigger } from '../core/motion';

export interface StripRealignOptions extends BaseOptions {
  /**
   * Total target duration of the effect in milliseconds.
   * Strip delays and individual puzzle movement durations scale proportionally.
   * @default 1400
   */
  duration?: number;
  /** Number of horizontal strips per line. Defaults to 4. */
  strips?: number;
  /** Maximum horizontal displacement in pixels. Defaults to 35. */
  maxOffset?: number;
}

const DEFAULT_DURATION = 1400;
const DEFAULT_MAX_DELAY = 120;

function generatePuzzleIntroKeyframes(maxOffset: number): Keyframe[] {
  const sign = Math.random() < 0.5 ? -1 : 1;
  const initialDist = Math.round(sign * (0.8 + Math.random() * 0.45) * maxOffset);

  const t1 = 0.18 + Math.random() * 0.08;
  const t1Hold = t1 + 0.06 + Math.random() * 0.05;
  const t2 = t1Hold + 0.18 + Math.random() * 0.08;
  const t2Hold = Math.min(0.72, t2 + 0.06 + Math.random() * 0.05);
  const t3 = t2Hold + 0.12 + Math.random() * 0.06;
  const tSolve = Math.min(0.95, t3 + 0.08 + Math.random() * 0.06);

  const pos1 = Math.round(-initialDist * (0.45 + Math.random() * 0.25));
  const pos2 = Math.round(initialDist * (0.18 + Math.random() * 0.18));
  const pos3 = Math.round(-initialDist * (0.05 + Math.random() * 0.08));

  return [
    { transform: `translate3d(${initialDist}px, 0, 0)`, opacity: 0.75, offset: 0 },
    { transform: `translate3d(${pos1}px, 0, 0)`, opacity: 0.88, offset: Number(t1.toFixed(3)) },
    { transform: `translate3d(${pos1}px, 0, 0)`, opacity: 0.88, offset: Number(t1Hold.toFixed(3)) },
    { transform: `translate3d(${pos2}px, 0, 0)`, opacity: 0.95, offset: Number(t2.toFixed(3)) },
    { transform: `translate3d(${pos2}px, 0, 0)`, opacity: 0.95, offset: Number(t2Hold.toFixed(3)) },
    { transform: `translate3d(${pos3}px, 0, 0)`, opacity: 1, offset: Number(t3.toFixed(3)) },
    { transform: 'translate3d(0, 0, 0)', opacity: 1, offset: Number(tSolve.toFixed(3)) },
    { transform: 'translate3d(0, 0, 0)', opacity: 1, offset: 1 },
  ];
}

function runSingleStripRealign(element: HTMLElement, options?: StripRealignOptions): AnimationHandle {
  if (prefersReducedMotion()) return createDummyHandle();

  const duration = normalizeDuration(options?.duration, DEFAULT_DURATION);
  const timingScale = duration / DEFAULT_DURATION;
  const actualMaxDelay = Math.round(DEFAULT_MAX_DELAY * timingScale);

  const {
    strips = 4,
    maxOffset = 35,
    revertOnFinish = true,
  } = options || {};

  const originalHTML = element.innerHTML;
  const originalAriaLabel = element.getAttribute('aria-label');
  const rawText = element.textContent || '';

  if (!rawText.trim()) return createDummyHandle();

  if (!originalAriaLabel) {
    element.setAttribute('aria-label', rawText.trim());
  }

  const computed = window.getComputedStyle(element);
  const preserveNewlines = ['pre', 'pre-wrap', 'pre-line', 'break-spaces'].includes(computed.whiteSpace);

  let processedText = rawText;
  if (!preserveNewlines) {
    processedText = processedText.replace(/\s+/g, ' ').trim();
  }
  
  const rawParagraphs = preserveNewlines ? processedText.split('\n') : [processedText];
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
      if (group.length > 0) lines.push(group.join(' '));
    });
  });

  if (lines.length === 0) {
    element.innerHTML = originalHTML;
    return createDummyHandle();
  }

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
    const height = !isNaN(parsedLineHeight) && parsedLineHeight > 0
      ? Math.ceil(parsedLineHeight)
      : Math.ceil(r.height || 36);
    return {
      text: lineText,
      width: Math.ceil(r.width) || element.offsetWidth || 300,
      height,
    };
  });
  element.removeChild(measureSpan);

  element.textContent = '';
  
  const innerWrapper = document.createElement('div');
  innerWrapper.className = 'wim-strip-wrapper';
  innerWrapper.style.position = 'relative';
  innerWrapper.style.display = 'flex';
  innerWrapper.style.flexDirection = 'column';
  innerWrapper.style.overflow = 'hidden';
  innerWrapper.style.alignItems = computed.textAlign === 'center' ? 'center' : computed.textAlign === 'right' ? 'flex-end' : 'flex-start';
  element.appendChild(innerWrapper);

  const animations = new Set<Animation>();
  
  lineMetrics.forEach(({ text: lineText, width: lineW, height: lineH }) => {
    // lineContainer is the stable bounding box for this logical line.
    // overflow:hidden here clips horizontal movement during the puzzle animation.
    // It MUST NOT be 'visible': strips translate left/right and must not bleed into
    // sibling lines or surrounding content.
    const lineContainer = document.createElement('div');
    lineContainer.style.position = 'relative';
    lineContainer.style.width = `${lineW}px`;
    lineContainer.style.height = `${lineH}px`;
    lineContainer.style.overflow = 'hidden';
    lineContainer.style.whiteSpace = 'nowrap';
    lineContainer.style.boxSizing = 'border-box';
    innerWrapper.appendChild(lineContainer);

    // Derive ALL strip boundaries from one consistent formula so that adjacent
    // strips always share the same boundary value — no independent per-strip
    // Math.round calls that could produce overlapping pixel rows.
    // boundaries[i]   = top of strip i   (px from lineContainer top)
    // boundaries[i+1] = bottom of strip i (px from lineContainer top)
    const boundaries: number[] = [];
    for (let j = 0; j <= strips; j++) {
      boundaries.push(Math.round((j * lineH) / strips));
    }

    for (let i = 0; i < strips; i++) {
      // clip-path inset values encode which vertical band this strip shows:
      //   topInset    = boundaries[i]         → hide everything above this strip
      //   bottomInset = lineH - boundaries[i+1] → hide everything below this strip
      // Because both values come from the same boundaries[] array, adjacent strips
      // share exactly the same boundary pixel — no gap, no overlap.
      const topInset = boundaries[i];
      const bottomInset = lineH - boundaries[i + 1];

      // Every stripWrapper is at the SAME absolute position (top:0, height:lineH)
      // and contains the SAME full-line text at top:0.  The clip-path is what
      // makes each one show only its own vertical band.
      //
      // ROOT CAUSE of the old ghost strip:
      //   The previous approach set stripWrapper.top = boundary[i] and
      //   innerContent.top = -boundary[i], then used overflow:hidden on the
      //   *animated* stripWrapper to clip the innerContent that extended above it.
      //   When translate3d is applied to an element, browser compositors may
      //   evaluate an ancestor overflow:hidden clip against the pre-transform
      //   layout position, not the painted position.  Strip 1's innerContent
      //   (laid out at y=0 in the lineContainer) was therefore NOT clipped by
      //   innerWrapper's overflow:hidden while being animated, so its top 25%
      //   painted directly on top of strip 0 — producing the ghost duplicate.
      //   Additionally lineContainer.overflow was 'visible', leaving innerWrapper
      //   as the only clip, which made the bug worse.
      //
      //   With clip-path on the animated element the clip travels with the
      //   translate3d in local coordinate space — no ambiguity, no ghost.
      const stripWrapper = document.createElement('div');
      stripWrapper.style.position = 'absolute';
      stripWrapper.style.top = '0';
      stripWrapper.style.left = '0';
      stripWrapper.style.width = `${lineW}px`;
      stripWrapper.style.height = `${lineH}px`;
      stripWrapper.style.clipPath = `inset(${topInset}px 0px ${bottomInset}px 0px)`;
      stripWrapper.setAttribute('aria-hidden', 'true');

      // innerContent renders the full line at top:0 in the same coordinate system
      // for every strip.  No offset needed — the clip-path does the slicing.
      const innerContent = document.createElement('div');
      innerContent.style.position = 'absolute';
      innerContent.style.top = '0';
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

      const keyframes = generatePuzzleIntroKeyframes(maxOffset);
      const stripDelay = Math.random() * actualMaxDelay;
      const stripDuration = duration * (0.8 + Math.random() * 0.4);

      if (typeof stripWrapper.animate === 'function') {
        const anim = stripWrapper.animate(keyframes, {
          duration: stripDuration,
          delay: stripDelay,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          fill: 'forwards',
        });
        animations.add(anim);
        anim.onfinish = () => animations.delete(anim);
      }
    }
  });

  const revert = () => {
    element.innerHTML = originalHTML;
    if (originalAriaLabel === null) element.removeAttribute('aria-label');
    else element.setAttribute('aria-label', originalAriaLabel);
  };

  let isCanceled = false;
  let resolveFinished!: () => void;
  const finished = new Promise<void>((res) => { resolveFinished = res; });

  const cancel = () => {
    isCanceled = true;
    animations.forEach((a) => a.cancel());
    revert();
    unregisterIntro(element);
    resolveFinished();
  };

  registerIntro(element, { cancel });

  Promise.all(Array.from(animations).map(a => a.finished)).then(() => {
    if (!isCanceled) {
      if (revertOnFinish) revert();
      unregisterIntro(element);
      resolveFinished();
    }
  }).catch(() => {});

  return { finished, cancel };
}

/**
 * Strip realign intro animation.
 * Slices each line of text into horizontal puzzle strips enclosed in display boxes
 * so when any strip slides out past the boundary it is clipped and hidden.
 * Supports immediate execution or scroll-triggered ('enter' | 'leave') activation across one or multiple targets.
 */
export function stripRealign(target: Target, options?: StripRealignOptions): AnimationHandle {
  return runAnimationWithTrigger(target, options, runSingleStripRealign, 'intro');
}

