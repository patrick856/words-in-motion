import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle } from '../core/motion';
import { splitChars } from '../core/split';

export interface ChunkedScrambleOptions extends BaseOptions {
  /** Number of words per chunk. Defaults to 2. */
  chunkSize?: number;
  /** Duration in milliseconds of trailing scramble per chunk. Defaults to 400. */
  scrambleDuration?: number;
  /** Character set used for decoy scrambling. Defaults to alphanumeric and symbols. */
  characterSet?: string;
}

const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';

/**
 * Chunked reveal with trailing scramble intro animation.
 * Reveals text in word chunks with a trailing character scramble and letter travel effect.
 */
export function chunkedScramble(
  target: Target,
  options?: ChunkedScrambleOptions
): AnimationHandle {
  const element = resolveElement(target);
  if (!element) {
    return createDummyHandle();
  }

  if (prefersReducedMotion()) {
    return createDummyHandle();
  }

  const {
    chunkSize = 2,
    scrambleDuration = 400,
    characterSet = DEFAULT_CHARS,
    stagger = 250,
  } = options || {};

  const { chars, revert } = splitChars(element);
  if (chars.length === 0) {
    return createDummyHandle();
  }

  // Store original character contents
  const originalTexts = chars.map((c) => c.textContent || '');

  // Hide all chars initially
  chars.forEach((c) => {
    c.style.opacity = '0';
  });

  // Group chars into word chunks
  const wordSpans = Array.from(element.querySelectorAll<HTMLElement>('.wim-word'));
  const chunks: HTMLElement[][] = [];
  let currentChunk: HTMLElement[] = [];

  const targetsToGroup = wordSpans.length > 0 ? wordSpans : chars;

  targetsToGroup.forEach((unit, idx) => {
    currentChunk.push(unit);
    if (currentChunk.length === chunkSize || idx === targetsToGroup.length - 1) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
  });

  let isCanceled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const intervals: ReturnType<typeof setInterval>[] = [];

  const finished = new Promise<void>((resolve) => {
    chunks.forEach((chunkUnits, chunkIndex) => {
      const delay = chunkIndex * stagger;

      const timer = setTimeout(() => {
        if (isCanceled) return;

        // Reveal current chunk units
        chunkUnits.forEach((unit) => {
          unit.style.opacity = '1';
          unit.animate(
            [
              { opacity: 0, transform: 'scale(0.85) translate3d(0, 10px, 0)' },
              { opacity: 1, transform: 'scale(1) translate3d(0, 0, 0)' },
            ],
            { duration: 250, easing: 'ease-out', fill: 'forwards' }
          );
        });

        // Trigger trailing scramble on previous chunk characters
        if (chunkIndex > 0) {
          const prevChunkUnits = chunks[chunkIndex - 1];
          prevChunkUnits.forEach((unit) => {
            const charElements = Array.from(unit.querySelectorAll<HTMLElement>('.wim-char'));
            const targets = charElements.length > 0 ? charElements : [unit];

            targets.forEach((charEl) => {
              const origText = charEl.textContent || '';
              if (origText.trim() === '') return;

              let elapsed = 0;
              const intervalTime = 40;

              const scrambleInterval = setInterval(() => {
                if (isCanceled) {
                  clearInterval(scrambleInterval);
                  return;
                }

                elapsed += intervalTime;
                if (elapsed >= scrambleDuration) {
                  clearInterval(scrambleInterval);
                  charEl.textContent = origText;
                  charEl.style.transform = 'translate3d(0, 0, 0)';
                } else {
                  // Random decoy character
                  const randomChar = characterSet.charAt(
                    Math.floor(Math.random() * characterSet.length)
                  );
                  charEl.textContent = randomChar;
                  // Slight lateral travel jitter
                  const travelOffset = (Math.random() - 0.5) * 4;
                  charEl.style.transform = `translate3d(${travelOffset}px, 0, 0)`;
                }
              }, intervalTime);

              intervals.push(scrambleInterval);
            });
          });
        }

        if (chunkIndex === chunks.length - 1) {
          const finalTimer = setTimeout(() => {
            if (!isCanceled) resolve();
          }, scrambleDuration + 100);
          timers.push(finalTimer);
        }
      }, delay);

      timers.push(timer);
    });
  });

  const cancel = () => {
    isCanceled = true;
    timers.forEach((t) => clearTimeout(t));
    intervals.forEach((i) => clearInterval(i));
    chars.forEach((c, i) => {
      c.textContent = originalTexts[i];
    });
    revert();
  };

  return { finished, cancel };
}
