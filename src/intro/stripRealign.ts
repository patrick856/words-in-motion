import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle, registerIntro, unregisterIntro } from '../core/motion';

export interface StripRealignOptions extends BaseOptions {
  /** Number of horizontal strips per line. Defaults to 4. */
  strips?: number;
  /** Maximum horizontal displacement in pixels. Defaults to 35. */
  maxOffset?: number;
}

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

/**
 * Strip realign intro animation.
 * Slices each line of text into horizontal puzzle strips enclosed in display boxes
 * so when any strip slides out past the boundary it is clipped and hidden.
 */
export function stripRealign(target: Target, options?: StripRealignOptions): AnimationHandle {
  const element = resolveElement(target);
  if (!element || prefersReducedMotion()) return createDummyHandle();

  const {
    strips = 4,
    maxOffset = 35,
    duration = 650,
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
  
  const paddingPx = parseFloat(computed.fontSize) * 0.3 || 5;

  lineMetrics.forEach(({ text: lineText, width: lineW, height: lineH }) => {
    const lineContainer = document.createElement('div');
    lineContainer.style.position = 'relative';
    lineContainer.style.width = `${lineW}px`;
    lineContainer.style.height = `${lineH}px`;
    lineContainer.style.overflow = 'visible'; // allow strips to overflow if we need to? wait, no. The prompt:
    // Expand the first strip's top boundary by 0.3em upward. Expand the last strip's bottom boundary by 0.3em downward.
    lineContainer.style.whiteSpace = 'nowrap';
    lineContainer.style.boxSizing = 'border-box';
    innerWrapper.appendChild(lineContainer);

    for (let i = 0; i < strips; i++) {
      let top = Math.round((i * lineH) / strips);
      let bottom = Math.round(((i + 1) * lineH) / strips);
      
      if (i === 0) top -= paddingPx;
      if (i === strips - 1) bottom += paddingPx;
      
      const stripHeight = Math.max(1, bottom - top);

      const stripWrapper = document.createElement('div');
      stripWrapper.style.position = 'absolute';
      stripWrapper.style.top = `${top}px`;
      stripWrapper.style.left = '0';
      stripWrapper.style.width = `${lineW}px`;
      stripWrapper.style.height = `${stripHeight}px`;
      stripWrapper.style.overflow = 'hidden';
      stripWrapper.setAttribute('aria-hidden', 'true');

      const innerContent = document.createElement('div');
      innerContent.style.position = 'absolute';
      innerContent.style.top = `-${top}px`;
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
      const stripDelay = Math.random() * 120;
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
