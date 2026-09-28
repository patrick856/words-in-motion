import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle, registerIntro, unregisterIntro } from '../core/motion';
import { splitChars } from '../core/split';

export interface ChunkedScrambleOptions extends BaseOptions {
  /** Words per chunk. Defaults to 2. */
  chunkSize?: number;
  /** MS between chunk starts. Defaults to 320. */
  chunkDelay?: number;
  /** Chunks after reveal before corruption. Defaults to 1. */
  corruptAfterChunks?: number;
  /** Chunks before healing. Defaults to 2. */
  healAfterChunks?: number | [min: number, max: number];
  /** Fraction of eligible letters corrupted. Defaults to 0.3. */
  corruptionRate?: number;
  /** Mode for corruption. Defaults to 'mixed'. */
  corruptMode?: 'instant' | 'from-behind' | 'mixed';
  /** Mode for healing. Defaults to 'mixed'. */
  healMode?: 'instant' | 'from-behind' | 'mixed';
  /** Probability of from-behind in mixed mode. Defaults to 0.5. */
  behindRatio?: number;
  /** Which neighbour for from-behind. Defaults to 'random'. */
  side?: 'left' | 'right' | 'random';
  /** MS for from-behind slide. Defaults to 260. */
  travelDuration?: number;
  /** MS between individual letter mutations during corruption or healing. Defaults to 45. */
  letterStagger?: number;
  /** Optional replacement pool override. */
  decoyChars?: string;
  /** From-behind easing. Defaults to 'cubic-bezier(0.16, 1, 0.3, 1)'. */
  easing?: string;
}

const DEFAULT_DECOYS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function isEligible(char: string): boolean {
  return /^[a-zA-Z0-9]$/.test(char);
}

function getDecoy(original: string, pool: string | undefined): string {
  const isLower = /^[a-z]$/.test(original);
  const isUpper = /^[A-Z]$/.test(original);
  const isDigit = /^[0-9]$/.test(original);
  let candidates = pool || DEFAULT_DECOYS;

  if (!pool) {
    if (isLower) candidates = 'abcdefghijklmnopqrstuvwxyz';
    else if (isUpper) candidates = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    else if (isDigit) candidates = '0123456789';
  } else {
    // If pool is provided, try to match case/type if possible, else use whole pool
    let typedCandidates = '';
    if (isLower) typedCandidates = candidates.replace(/[^a-z]/g, '');
    else if (isUpper) typedCandidates = candidates.replace(/[^A-Z]/g, '');
    else if (isDigit) typedCandidates = candidates.replace(/[^0-9]/g, '');
    if (typedCandidates.length > 0) candidates = typedCandidates;
  }

  candidates = candidates.split('').filter((c) => c !== original).join('');
  if (candidates.length === 0) candidates = pool || DEFAULT_DECOYS;
  if (candidates.length === 0) candidates = 'X';
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Chunked reveal with typo corruption and healing intro animation.
 *
 * Each chunk of words appears instantly in its final layout position without
 * fade or translate animations. As subsequent chunks appear, earlier chunks
 * develop temporary typographical errors which later heal back to the original text.
 * Swapped glyphs render at their natural typographic width without clipping.
 */
export function chunkedScramble(target: Target, options?: ChunkedScrambleOptions): AnimationHandle {
  const element = resolveElement(target);
  if (!element) return createDummyHandle();
  if (prefersReducedMotion()) return createDummyHandle();

  const {
    chunkSize = 2,
    chunkDelay = 320,
    corruptAfterChunks = 1,
    healAfterChunks = 2,
    corruptionRate = 0.3,
    corruptMode = 'mixed',
    healMode = 'mixed',
    behindRatio = 0.5,
    side = 'random',
    travelDuration = 260,
    letterStagger = 45,
    decoyChars,
    easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
    revertOnFinish = true,
  } = options || {};

  const { chars, revert, granularity } = splitChars(element);
  if (chars.length === 0) {
    revert();
    return createDummyHandle();
  }

  const words = Array.from(element.querySelectorAll<HTMLElement>('.wim-word'));
  if (words.length === 0) {
    revert();
    return createDummyHandle();
  }

  let isCanceled = false;
  const timeouts = new Set<ReturnType<typeof setTimeout>>();
  const animations = new Set<Animation>();

  let resolveFinished!: () => void;
  const finished = new Promise<void>((res) => {
    resolveFinished = res;
  });

  const cancel = () => {
    isCanceled = true;
    for (const t of timeouts) clearTimeout(t);
    timeouts.clear();
    for (const a of animations) a.cancel();
    animations.clear();
    revert();
    unregisterIntro(element as HTMLElement);
    resolveFinished();
  };

  registerIntro(element as HTMLElement, { cancel });

  // Group words into chunks of chunkSize
  const chunks: { words: HTMLElement[]; index: number }[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push({ words: words.slice(i, i + chunkSize), index: chunks.length });
  }

  // Pre-hide all words so initial layout is fully reserved without collapsing.
  // Using visibility: hidden preserves all dimensions, margins, and line wraps.
  for (const word of words) {
    word.style.visibility = 'hidden';
  }

  type CharData = {
    slot: HTMLElement;
    current: HTMLElement;
    incoming: HTMLElement;
    origText: string;
    targetText: string;
    wordChars: CharData[];
  };
  const charDataList: CharData[] = [];

  if (granularity === 'char') {
    for (const word of words) {
      const wChars = Array.from(word.querySelectorAll<HTMLElement>('.wim-char'));
      const wordCharData: CharData[] = [];
      for (const c of wChars) {
        const text = c.textContent || '';
        if (!text.trim()) continue; // skip pure whitespace if any

        // Setup character slot with natural width (no fixed width or clipPath)
        c.style.display = 'inline-block';
        c.style.position = 'relative';
        c.style.overflow = 'visible';
        c.textContent = '';

        const curr = document.createElement('span');
        curr.setAttribute('aria-hidden', 'true');
        curr.textContent = text;
        curr.style.display = 'inline-block';

        const inc = document.createElement('span');
        inc.setAttribute('aria-hidden', 'true');
        inc.style.display = 'inline-block';
        inc.style.position = 'absolute';
        inc.style.top = '0';
        inc.style.left = '0';
        inc.style.whiteSpace = 'nowrap';
        inc.style.visibility = 'hidden';

        c.appendChild(curr);
        c.appendChild(inc);

        const cd: CharData = {
          slot: c,
          current: curr,
          incoming: inc,
          origText: text,
          targetText: text,
          wordChars: wordCharData,
        };
        wordCharData.push(cd);
        charDataList.push(cd);
      }
    }
  }

  // Build the schedule of chunk events
  const chunkEvents: { time: number; type: 'reveal' | 'corrupt' | 'heal'; chunkIndex: number }[] = [];

  if (chunks.length <= 1 || granularity === 'word') {
    for (let i = 0; i < chunks.length; i++) {
      chunkEvents.push({ time: i * chunkDelay, type: 'reveal', chunkIndex: i });
    }
  } else {
    for (let i = 0; i < chunks.length; i++) {
      const revealTime = i * chunkDelay;
      chunkEvents.push({ time: revealTime, type: 'reveal', chunkIndex: i });

      if (i < chunks.length - 1) {
        // Never corrupt the final chunk
        const corruptTime = revealTime + corruptAfterChunks * chunkDelay;
        chunkEvents.push({ time: corruptTime, type: 'corrupt', chunkIndex: i });

        const hAfter = Array.isArray(healAfterChunks)
          ? Math.floor(Math.random() * (healAfterChunks[1] - healAfterChunks[0] + 1)) + healAfterChunks[0]
          : healAfterChunks;

        const healTime = corruptTime + hAfter * chunkDelay;
        chunkEvents.push({ time: healTime, type: 'heal', chunkIndex: i });
      }
    }
  }

  chunkEvents.sort((a, b) => a.time - b.time);

  let chunksCompleted = 0;
  const totalExpectedCompletions = chunkEvents.length;

  function onEventDone() {
    chunksCompleted++;
    if (chunksCompleted >= totalExpectedCompletions) {
      if (!isCanceled) {
        if (revertOnFinish) {
          revert();
        }
        unregisterIntro(element as HTMLElement);
        resolveFinished();
      }
    }
  }

  const scheduleTimeout = (fn: () => void, delay: number) => {
    const t = setTimeout(() => {
      timeouts.delete(t);
      if (!isCanceled) fn();
    }, delay);
    timeouts.add(t);
  };

  const playAnim = (el: HTMLElement, keyframes: Keyframe[], animOptions: KeyframeAnimationOptions) => {
    const a = el.animate(keyframes, animOptions);
    animations.add(a);
    a.onfinish = () => {
      animations.delete(a);
    };
    return a;
  };

  const executeMutation = (cd: CharData, newChar: string, mode: 'instant' | 'from-behind' | 'mixed') => {
    let actualMode = mode === 'mixed' ? (Math.random() < behindRatio ? 'from-behind' : 'instant') : mode;

    if (actualMode === 'from-behind') {
      const idx = cd.wordChars.indexOf(cd);
      let actualSide = side;
      if (actualSide === 'random') actualSide = Math.random() < 0.5 ? 'left' : 'right';

      if (actualSide === 'left' && idx === 0) actualSide = 'right';
      if (actualSide === 'right' && idx === cd.wordChars.length - 1) actualSide = 'left';

      if ((actualSide === 'left' && idx === 0) || (actualSide === 'right' && idx === cd.wordChars.length - 1)) {
        actualMode = 'instant'; // 1-char word fallback
      } else {
        const neighbour = actualSide === 'left' ? cd.wordChars[idx - 1] : cd.wordChars[idx + 1];
        if (neighbour) {
          neighbour.slot.style.zIndex = '1';
        }
        cd.slot.style.zIndex = '0';

        cd.incoming.textContent = newChar;
        cd.incoming.style.visibility = 'visible';

        const fromX = actualSide === 'left' ? '-100%' : '100%';
        const a1 = playAnim(
          cd.incoming,
          [{ transform: `translateX(${fromX})` }, { transform: 'translateX(0)' }],
          { duration: travelDuration, easing, fill: 'forwards' }
        );

        const fadeTime = travelDuration * 0.6;
        const a2 = playAnim(cd.current, [{ opacity: 1 }, { opacity: 0 }], {
          duration: fadeTime,
          easing,
          fill: 'forwards',
        });

        scheduleTimeout(() => {
          cd.current.textContent = newChar;
          a1.cancel();
          a2.cancel();
          cd.current.style.opacity = '1';
          cd.incoming.style.visibility = 'hidden';
          cd.incoming.textContent = '';
          cd.incoming.style.transform = 'none';
          if (neighbour) {
            neighbour.slot.style.zIndex = '';
          }
          cd.slot.style.zIndex = '';
        }, travelDuration);
      }
    }

    if (actualMode === 'instant') {
      cd.current.textContent = newChar;
    }
  };

  chunkEvents.forEach((ev) => {
    scheduleTimeout(() => {
      const chunk = chunks[ev.chunkIndex];

      if (ev.type === 'reveal') {
        // Complete chunk becomes visible instantly in its final position without any animation
        chunk.words.forEach((w) => {
          w.style.visibility = 'visible';
        });
        onEventDone();
      } else if (ev.type === 'corrupt' && granularity === 'char') {
        const eligible: CharData[] = [];
        for (const w of chunk.words) {
          const wChars = Array.from(w.querySelectorAll<HTMLElement>('.wim-char'));
          const wordEligible = wChars
            .map((wc) => charDataList.find((x) => x.slot === wc))
            .filter((x): x is CharData => Boolean(x && isEligible(x.origText)));
          // Max 2 corrupted per word
          wordEligible.sort(() => Math.random() - 0.5);
          eligible.push(...wordEligible.slice(0, 2));
        }

        let toCorruptCount = Math.ceil(eligible.length * corruptionRate);
        if (eligible.length > 0 && toCorruptCount === 0) toCorruptCount = 1;

        const toCorrupt = eligible.sort(() => Math.random() - 0.5).slice(0, toCorruptCount);

        if (toCorrupt.length === 0) {
          onEventDone();
        } else {
          toCorrupt.forEach((cd, i) => {
            scheduleTimeout(() => {
              const decoy = getDecoy(cd.origText, decoyChars);
              cd.targetText = decoy;
              executeMutation(cd, decoy, corruptMode);
              if (i === toCorrupt.length - 1) {
                scheduleTimeout(onEventDone, travelDuration);
              }
            }, i * letterStagger);
          });
        }
      } else if (ev.type === 'heal' && granularity === 'char') {
        const toHeal: CharData[] = [];
        for (const w of chunk.words) {
          const wChars = Array.from(w.querySelectorAll<HTMLElement>('.wim-char'));
          wChars.forEach((wc) => {
            const cd = charDataList.find((x) => x.slot === wc);
            if (cd && cd.targetText !== cd.origText) {
              toHeal.push(cd);
            }
          });
        }

        if (toHeal.length === 0) {
          onEventDone();
        } else {
          toHeal.forEach((cd, i) => {
            scheduleTimeout(() => {
              cd.targetText = cd.origText;
              executeMutation(cd, cd.origText, healMode);
              if (i === toHeal.length - 1) {
                scheduleTimeout(onEventDone, travelDuration);
              }
            }, i * letterStagger);
          });
        }
      } else {
        onEventDone();
      }
    }, ev.time);
  });

  if (chunkEvents.length === 0) {
    onEventDone();
  }

  return { finished, cancel };
}
