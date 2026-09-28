import type { Target } from './types';
import { resolveElement } from './motion';

export interface SplitWordsResult {
  words: HTMLElement[];
  revert: () => void;
}
export interface SplitCharsResult {
  chars: HTMLElement[];
  revert: () => void;
  granularity: 'char' | 'word';
}

function graphemes(text: string): string[] {
  return typeof Intl.Segmenter === 'function'
    ? Array.from(
        new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
        (s) => s.segment
      )
    : Array.from(text);
}

function split(target: Target, by: 'char' | 'word'): SplitCharsResult {
  const element = resolveElement(target);
  if (!element) return { chars: [], revert: () => {}, granularity: by };
  const label = element.getAttribute('aria-label');
  const text = element.textContent || '';
  const joined =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0900-\u0DFF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
  if (joined || window.getComputedStyle(element).direction === 'rtl' || element.dir === 'rtl')
    by = 'word';
  if (label === null && text.trim()) element.setAttribute('aria-label', text);
  const chars: HTMLElement[] = [];
  const parents = new Map<Node, Node[]>([[element, Array.from(element.childNodes)]]);
  const linkLabels = new Map<HTMLElement, string | null>();
  for (const link of element.querySelectorAll<HTMLElement>('a, button')) {
    if (!link.hasAttribute('aria-label') && !link.hasAttribute('aria-labelledby')) {
      linkLabels.set(link, null);
      link.setAttribute('aria-label', link.textContent || '');
    }
  }
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.parentElement?.closest('script, style, textarea, [aria-hidden="true"]'))
      texts.push(node);
  }
  const span = (className: string, content?: string) => {
    const unit = document.createElement('span');
    unit.className = className;
    unit.style.display = 'inline-block';
    unit.setAttribute('aria-hidden', 'true');
    if (content !== undefined) unit.textContent = content;
    return unit;
  };
  for (const original of texts) {
    const fragment = document.createDocumentFragment();
    if (original.parentNode && !parents.has(original.parentNode))
      parents.set(original.parentNode, Array.from(original.parentNode.childNodes));
    const ws = window.getComputedStyle(original.parentElement!).whiteSpace;
    const preserve = ['pre', 'pre-wrap', 'pre-line', 'break-spaces'].includes(ws);
    for (const token of original.data.split(/(\s+)/u).filter(Boolean)) {
      if (/^\s+$/u.test(token)) {
        if (preserve) {
          token.split('\n').forEach((part, i) => {
            if (i) fragment.append(document.createElement('br'));
            if (part) {
              const space = span('wim-space', part);
              space.style.whiteSpace = 'pre';
              fragment.append(space);
            }
          });
        } else {
          const space = span('wim-space', token.replace(/[\t\r\n ]+/g, ' '));
          space.style.whiteSpace = 'pre';
          fragment.append(space);
        }
        continue;
      }
      const word = span('wim-word');
      word.style.whiteSpace = 'nowrap';
      if (by === 'word') {
        word.textContent = token;
        chars.push(word);
      } else {
        for (const g of graphemes(token)) {
          const char = span('wim-char', g);
          word.append(char);
          chars.push(char);
        }
      }
      fragment.append(word);
    }
    original.replaceWith(fragment);
  }
  let reverted = false;
  return {
    chars,
    granularity: by,
    revert: () => {
      if (reverted) return;
      reverted = true;
      for (const [parent, children] of parents) {
        (parent as HTMLElement).replaceChildren(...children);
      }
      if (label === null) element.removeAttribute('aria-label');
      else element.setAttribute('aria-label', label);
      for (const link of linkLabels.keys()) link.removeAttribute('aria-label');
    },
  };
}

/** Preserves nested markup, original nodes/listeners, explicit breaks and accessible labels. */
export function splitWords(target: Target): SplitWordsResult {
  const result = split(target, 'word');
  return { words: result.chars, revert: result.revert };
}

/** Grapheme-safe characters; joined scripts and RTL retain whole words. */
export function splitChars(target: Target): SplitCharsResult {
  return split(target, 'char');
}
