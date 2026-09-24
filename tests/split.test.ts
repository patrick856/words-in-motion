import { describe, it, expect, beforeEach } from 'vitest';
import { splitWords, splitChars } from '../src/core/split';

describe('Text Splitter (core/split.ts)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('splitWords', () => {
    it('splits text into inline-block word spans', () => {
      container.textContent = 'Words in motion';
      const { words, revert } = splitWords(container);

      expect(words).toHaveLength(3);
      expect(words[0].textContent).toBe('Words');
      expect(words[1].textContent).toBe('in');
      expect(words[2].textContent).toBe('motion');

      words.forEach((w) => {
        expect(w.style.display).toBe('inline-block');
        expect(w.style.whiteSpace).toBe('nowrap');
        expect(w.getAttribute('aria-hidden')).toBe('true');
      });

      expect(container.getAttribute('aria-label')).toBe('Words in motion');

      revert();
      expect(container.innerHTML).toBe('Words in motion');
      expect(container.hasAttribute('aria-label')).toBe(false);
    });

    it('works with CSS selector target string', () => {
      container.id = 'test-target';
      container.textContent = 'Hello world';

      const { words } = splitWords('#test-target');
      expect(words).toHaveLength(2);
    });
  });

  describe('splitChars', () => {
    it('splits text into character spans nested in word spans', () => {
      container.textContent = 'Fast motion';
      const { chars, revert } = splitChars(container);

      expect(chars).toHaveLength(10); // "Fast" (4) + "motion" (6)
      expect(chars[0].textContent).toBe('F');
      expect(chars[3].textContent).toBe('t');
      expect(chars[4].textContent).toBe('m');

      chars.forEach((c) => {
        expect(c.style.display).toBe('inline-block');
        expect(c.getAttribute('aria-hidden')).toBe('true');
      });

      expect(container.getAttribute('aria-label')).toBe('Fast motion');

      revert();
      expect(container.innerHTML).toBe('Fast motion');
    });

    it('handles graphemes and emojis correctly', () => {
      container.textContent = 'Hello 🚀 world';
      const { chars } = splitChars(container);

      // "Hello" (5) + "🚀" (1) + "world" (5) = 11 chars
      expect(chars).toHaveLength(11);
      const rocketChar = chars.find((c) => c.textContent === '🚀');
      expect(rocketChar).toBeDefined();
    });

    it('falls back to word-level splitting for Arabic / joined scripts', () => {
      container.textContent = 'مرحبا بالعالم';
      const { chars } = splitChars(container);

      // Should fall back to word-level split: 2 words
      expect(chars).toHaveLength(2);
      expect(chars[0].textContent).toBe('مرحبا');
      expect(chars[1].textContent).toBe('بالعالم');
    });

    it('falls back to word-level splitting for dir="rtl"', () => {
      container.setAttribute('dir', 'rtl');
      container.textContent = 'RTL Text';
      const { chars } = splitChars(container);

      // Falls back to words: 2 words
      expect(chars).toHaveLength(2);
      expect(chars[0].textContent).toBe('RTL');
      expect(chars[1].textContent).toBe('Text');
    });
  });
});
