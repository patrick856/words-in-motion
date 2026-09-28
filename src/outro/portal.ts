import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { prefersReducedMotion, createDummyHandle, runAnimationWithTrigger } from '../core/motion';

export interface PortalOptions extends BaseOptions {
  /** Animation duration in milliseconds. Defaults to 2500ms. */
  duration?: number;
  /** Transition easing for the continuous conveyor motion. Defaults to 'linear'. */
  easing?: string;
  /** Whether to keep text hidden or restore original state after completion. Defaults to false. */
  keep?: boolean;
}

function runSinglePortal(
  element: HTMLElement,
  options?: PortalOptions
): AnimationHandle {
  if (prefersReducedMotion()) {
    element.style.opacity = '0';
    return createDummyHandle();
  }

  const {
    duration = 2500,
    easing = 'linear',
    keep = false,
  } = options || {};

  const originalHTML = element.innerHTML;
  const originalAriaLabel = element.getAttribute('aria-label');
  const text = (element.textContent || '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();

  if (!text) {
    if (!keep) element.style.opacity = '0';
    return createDummyHandle();
  }

  if (!originalAriaLabel) {
    element.setAttribute('aria-label', text);
  }

  const computed = window.getComputedStyle(element);
  const align = computed.textAlign;

  // Split words into temporary spans to detect natural browser line breaks
  element.textContent = '';
  const words = text.split(' ');
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

  // Group words into lines based on vertical offset
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

  const lines = lineWordGroups.map((group) => group.join(' '));

  // Create an off-screen measuring span to measure exact horizontal text offsets and line height
  const measureSpan = document.createElement('span');
  measureSpan.style.position = 'absolute';
  measureSpan.style.visibility = 'hidden';
  measureSpan.style.whiteSpace = 'nowrap';
  measureSpan.style.pointerEvents = 'none';
  measureSpan.style.font = computed.font;
  element.appendChild(measureSpan);

  const lineHeights: number[] = [];
  const lineOffsets: number[] = [];
  const lineWidths: number[] = [];

  // Calculate pixel start offset of each line in the continuous full text
  lines.forEach((lineText, k) => {
    const prefix = lines.slice(0, k).join(' ') + (k > 0 ? ' ' : '');
    measureSpan.textContent = prefix;
    const offset = measureSpan.getBoundingClientRect().width;
    lineOffsets.push(offset);

    measureSpan.textContent = lineText;
    const rect = measureSpan.getBoundingClientRect();
    lineHeights.push(rect.height || 36);
  });

  // Total text width of full text
  measureSpan.textContent = text;
  const totalTextWidth = measureSpan.getBoundingClientRect().width;
  element.removeChild(measureSpan);

  // Calculate slot widths W_k so that offset_k + W_k = offset_{k+1}
  for (let k = 0; k < lines.length; k++) {
    const nextOffset = k < lines.length - 1 ? lineOffsets[k + 1] : totalTextWidth;
    lineWidths.push(Math.max(10, nextOffset - lineOffsets[k]));
  }

  const lineHeight = lineHeights[0] || 36;

  const originalStyle = {
    position: element.style.position,
    minHeight: element.style.minHeight,
    display: element.style.display,
    flexDirection: element.style.flexDirection,
    alignItems: element.style.alignItems,
  };

  element.textContent = '';
  element.style.position = 'relative';
  element.style.display = 'flex';
  element.style.flexDirection = 'column';
  element.style.alignItems =
    align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  element.style.minHeight = `${lines.length * lineHeight}px`;

  const animations: Animation[] = [];

  lines.forEach((_, k) => {
    const slotWidth = lineWidths[k];
    const offsetK = lineOffsets[k];

    const slot = document.createElement('div');
    slot.style.position = 'relative';
    slot.style.width = `${slotWidth}px`;
    slot.style.height = `${lineHeight}px`;
    slot.style.overflow = 'hidden';
    slot.style.whiteSpace = 'nowrap';
    slot.style.boxSizing = 'border-box';

    const track = document.createElement('div');
    track.style.position = 'absolute';
    track.style.top = '0';
    track.style.left = '0';
    track.style.whiteSpace = 'nowrap';
    track.style.willChange = 'transform';
    track.textContent = text;
    track.style.transform = `translate3d(${-offsetK}px, 0, 0)`;

    slot.appendChild(track);
    element.appendChild(slot);

    // Animate track to the left by totalTextWidth
    if (typeof track.animate === 'function') {
      const anim = track.animate(
        [
          { transform: `translate3d(${-offsetK}px, 0, 0)` },
          { transform: `translate3d(${-offsetK - totalTextWidth}px, 0, 0)` },
        ],
        {
          duration,
          easing,
          fill: 'forwards',
        }
      );
      animations.push(anim);
    }
  });

  const revert = () => {
    element.innerHTML = originalHTML;
    if (originalAriaLabel === null) {
      element.removeAttribute('aria-label');
    } else {
      element.setAttribute('aria-label', originalAriaLabel);
    }
    element.style.position = originalStyle.position;
    element.style.minHeight = originalStyle.minHeight;
    element.style.display = originalStyle.display;
    element.style.flexDirection = originalStyle.flexDirection;
    element.style.alignItems = originalStyle.alignItems;
  };

  let finished: Promise<void>;
  if (animations.length > 0) {
    finished = Promise.all(animations.map((a) => a.finished)).then(() => {
      if (!keep) {
        element.style.opacity = '0';
      }
      revert();
    });
  } else {
    if (!keep) {
      element.style.opacity = '0';
    }
    revert();
    finished = Promise.resolve();
  }

  const cancel = () => {
    animations.forEach((a) => a.cancel());
    revert();
    element.style.opacity = '';
  };

  return { finished, cancel };
}

/**
 * Portal outro animation.
 * Continuously glides text through a multiline portal wormhole in real time:
 * text sliding out of the left end of each line simultaneously emerges from the
 * right end of the line above it, with the first line exiting the final portal.
 * Supports immediate execution or scroll-triggered ('enter' | 'leave') activation across one or multiple targets.
 */
export function portal(
  target: Target,
  options?: PortalOptions
): AnimationHandle {
  return runAnimationWithTrigger(target, options, runSinglePortal, 'outro');
}




