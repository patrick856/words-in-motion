import type { Target } from './types';
import { resolveElement } from './motion';

export interface SplitWordsResult {
  words: HTMLElement[];
  revert: () => void;
}

export interface SplitCharsResult {
  chars: HTMLElement[];
  revert: () => void;
}

interface SegmenterInstance {
  segment(input: string): Iterable<{ segment: string }>;
}

interface IntlWithSegmenter {
  Segmenter?: new (
    locales?: string | string[],
    options?: { granularity?: string }
  ) => SegmenterInstance;
}

/**
 * Checks if the string contains Arabic or other cursive/joined script characters,
 * or if the target element has RTL directionality.
 */
function isJoinedScriptOrRtl(element: HTMLElement, text: string): boolean {
  const isRtl =
    element.getAttribute('dir') === 'rtl' ||
    (typeof window !== 'undefined' &&
      window.getComputedStyle &&
      window.getComputedStyle(element).direction === 'rtl');
  const hasArabicOrJoined =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
  return isRtl || hasArabicOrJoined;
}

/**
 * Segments a string into individual graphemes (emoji-safe).
 */
function segmentGraphemes(text: string): string[] {
  const intl = Intl as unknown as IntlWithSegmenter;
  if (typeof intl !== 'undefined' && intl.Segmenter) {
    const segmenter = new intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

/**
 * Splits an element's text into word-level <span> elements.
 * Preserves accessibility via aria-label on the container and aria-hidden on generated spans.
 */
export function splitWords(target: Target): SplitWordsResult {
  const element = resolveElement(target);
  if (!element) {
    return { words: [], revert: () => {} };
  }

  const originalHTML = element.innerHTML;
  const originalAriaLabel = element.getAttribute('aria-label');
  const text = element.textContent || '';

  // Accessibility: set original text on parent aria-label
  if (!originalAriaLabel) {
    element.setAttribute('aria-label', text);
  }

  element.textContent = '';

  const wordTokens = text.trim().split(/\s+/).filter(Boolean);
  const words: HTMLElement[] = [];

  wordTokens.forEach((wordText, index) => {
    const wordSpan = document.createElement('span');
    wordSpan.style.display = 'inline-block';
    wordSpan.style.whiteSpace = 'nowrap';
    wordSpan.setAttribute('aria-hidden', 'true');
    wordSpan.textContent = wordText;

    element.appendChild(wordSpan);
    words.push(wordSpan);

    if (index < wordTokens.length - 1) {
      element.appendChild(document.createTextNode(' '));
    }
  });

  const revert = () => {
    element.innerHTML = originalHTML;
    if (originalAriaLabel === null) {
      element.removeAttribute('aria-label');
    } else {
      element.setAttribute('aria-label', originalAriaLabel);
    }
  };

  return { words, revert };
}

/**
 * Splits an element's text into character-level <span> elements grouped inside word <span> containers.
 * For Arabic/RTL/joined scripts, falls back to word splitting to prevent breaking cursive joining.
 */
export function splitChars(target: Target): SplitCharsResult {
  const element = resolveElement(target);
  if (!element) {
    return { chars: [], revert: () => {} };
  }

  const text = element.textContent || '';

  // Fall back to word-level splitting for connected scripts or RTL
  if (isJoinedScriptOrRtl(element, text)) {
    const wordResult = splitWords(element);
    return { chars: wordResult.words, revert: wordResult.revert };
  }

  const originalHTML = element.innerHTML;
  const originalAriaLabel = element.getAttribute('aria-label');

  if (!originalAriaLabel) {
    element.setAttribute('aria-label', text);
  }

  element.textContent = '';

  const wordTokens = text.trim().split(/\s+/).filter(Boolean);
  const chars: HTMLElement[] = [];

  wordTokens.forEach((wordText, wordIndex) => {
    const wordSpan = document.createElement('span');
    wordSpan.style.display = 'inline-block';
    wordSpan.style.whiteSpace = 'nowrap';
    wordSpan.setAttribute('aria-hidden', 'true');

    const graphemes = segmentGraphemes(wordText);
    graphemes.forEach((charText) => {
      const charSpan = document.createElement('span');
      charSpan.style.display = 'inline-block';
      charSpan.setAttribute('aria-hidden', 'true');
      charSpan.textContent = charText;

      wordSpan.appendChild(charSpan);
      chars.push(charSpan);
    });

    element.appendChild(wordSpan);

    if (wordIndex < wordTokens.length - 1) {
      element.appendChild(document.createTextNode(' '));
    }
  });

  const revert = () => {
    element.innerHTML = originalHTML;
    if (originalAriaLabel === null) {
      element.removeAttribute('aria-label');
    } else {
      element.setAttribute('aria-label', originalAriaLabel);
    }
  };

  return { chars, revert };
}
