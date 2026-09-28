import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { prefersReducedMotion, createDummyHandle, registerIntro, unregisterIntro, normalizeDuration, runAnimationWithTrigger } from '../core/motion';
import { splitChars } from '../core/split';

export type RevealBy = 'lines' | 'chunks';

export interface ChunkedScrambleOptions extends BaseOptions {
  /**
   * Total target duration of the effect in milliseconds.
   * Reveal, corruption, healing, and letter transition timings scale proportionally unless explicitly overridden.
   * @default 1800
   */
  duration?: number;
  /**
   * Determines how text is grouped for reveal and corruption scheduling.
   *
   * - "lines": reveal one rendered horizontal line at a time.
   * - "chunks": reveal groups of words controlled by `chunkSize`.
   *
   * @default "lines"
   */
  revealBy?: RevealBy;
  /**
   * Number of words per reveal group when `revealBy` is `"chunks"`.
   * Ignored when `revealBy` is `"lines"`.
   * @default 2
   */
  chunkSize?: number;
  /** MS cadence for corruption/healing effect ticks. Defaults to 300 scaled by duration. */
  effectInterval?: number;
  /** Legacy alias for effectInterval. Defaults to 300 scaled by duration. */
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
  /** MS for from-behind slide. Defaults to 260 scaled by duration. */
  travelDuration?: number;
  /** MS between individual letter mutations during corruption or healing. Defaults to 45 scaled by duration. */
  letterStagger?: number;
  /** Optional replacement pool override. */
  decoyChars?: string;
  /** From-behind easing. Defaults to 'cubic-bezier(0.16, 1, 0.3, 1)'. */
  easing?: string;
}

const DEFAULT_DECOYS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DEFAULT_DURATION = 1800;
const DEFAULT_EFFECT_INTERVAL = 300;
const DEFAULT_TRAVEL_DURATION = 260;
const DEFAULT_LETTER_STAGGER = 45;
const REVEAL_SPEED_MULTIPLIER = 5;

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

function hasLineBreakBetween(prev: HTMLElement, curr: HTMLElement): boolean {
  let node: Node | null = prev.nextSibling;
  while (node && node !== curr) {
    if (node.nodeName === 'BR') return true;
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).querySelector('br')) return true;
    node = node.nextSibling;
  }
  return false;
}

function getWordMetrics(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  if (rect.height > 0 || rect.width > 0) {
    return { top: rect.top, height: rect.height };
  }
  return { top: el.offsetTop, height: el.offsetHeight };
}

interface ScrambleGroup {
  words: HTMLElement[];
  index: number;
}

function groupWordsByLine(words: HTMLElement[]): ScrambleGroup[] {
  if (words.length === 0) return [];

  const lineGroups: HTMLElement[][] = [];
  let currentGroup: HTMLElement[] = [words[0]];
  lineGroups.push(currentGroup);

  let currentLineTops: number[] = [getWordMetrics(words[0]).top];
  let lastHeight = getWordMetrics(words[0]).height;

  for (let i = 1; i < words.length; i++) {
    const prevWord = words[i - 1];
    const currWord = words[i];

    const hasBr = hasLineBreakBetween(prevWord, currWord);
    const currMetrics = getWordMetrics(currWord);

    // Mean top of words currently assigned to the active line
    const avgCurrentTop = currentLineTops.reduce((a, b) => a + b, 0) / currentLineTops.length;
    const refHeight = currMetrics.height || lastHeight || 16;
    const tolerance = Math.max(4, Math.round(refHeight * 0.4));

    const isNewLine = hasBr || (currMetrics.top > avgCurrentTop + tolerance);

    if (isNewLine) {
      currentGroup = [currWord];
      lineGroups.push(currentGroup);
      currentLineTops = [currMetrics.top];
      if (currMetrics.height > 0) lastHeight = currMetrics.height;
    } else {
      currentGroup.push(currWord);
      currentLineTops.push(currMetrics.top);
      if (currMetrics.height > 0) lastHeight = currMetrics.height;
    }
  }

  return lineGroups.map((groupWords, index) => ({
    words: groupWords,
    index,
  }));
}

/**
 * Chunked or line-by-line reveal with typo corruption and healing intro animation.
 *
 * When `revealBy: 'lines'` (default), text reveals one rendered horizontal line at a time.
 * When `revealBy: 'chunks'`, text reveals in word groups controlled by `chunkSize`.
 * Each group appears instantly in its final layout position without fade or translate animations.
 * Text reveals quickly (5× faster than corruption). As groups appear, earlier groups
 * (including the final group in the tail phase) develop temporary typographical errors which
 * later heal back to the original text. Swapped glyphs render at their natural typographic width.
 */
function runSingleChunkedScramble(element: HTMLElement, options?: ChunkedScrambleOptions): AnimationHandle {
  if (prefersReducedMotion()) return createDummyHandle();

  const duration = normalizeDuration(options?.duration, DEFAULT_DURATION);
  const timingScale = duration / DEFAULT_DURATION;

  const {
    revealBy = 'lines',
    chunkSize = 2,
    corruptAfterChunks = 1,
    healAfterChunks = 2,
    corruptionRate = 0.3,
    corruptMode = 'mixed',
    healMode = 'mixed',
    behindRatio = 0.5,
    side = 'random',
    decoyChars,
    easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
    revertOnFinish = true,
  } = options || {};

  // Base corruption/healing cadence and derived fast reveal interval
  const corruptionTick = typeof options?.effectInterval === 'number'
    ? options.effectInterval
    : typeof options?.chunkDelay === 'number'
    ? options.chunkDelay
    : Math.max(20, Math.round(DEFAULT_EFFECT_INTERVAL * timingScale));

  const revealTick = corruptionTick / REVEAL_SPEED_MULTIPLIER;

  const actualTravelDuration = typeof options?.travelDuration === 'number'
    ? options.travelDuration
    : Math.max(10, Math.round(DEFAULT_TRAVEL_DURATION * timingScale));

  const actualLetterStagger = typeof options?.letterStagger === 'number'
    ? options.letterStagger
    : Math.max(2, Math.round(DEFAULT_LETTER_STAGGER * timingScale));

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

  // Measure and freeze groups at initialization (before hiding words or mutating slots)
  const groups: ScrambleGroup[] = [];
  if (revealBy === 'chunks') {
    const actualChunkSize = Math.max(1, Math.floor(chunkSize));
    for (let i = 0; i < words.length; i += actualChunkSize) {
      groups.push({ words: words.slice(i, i + actualChunkSize), index: groups.length });
    }
  } else {
    groups.push(...groupWordsByLine(words));
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

  // Build the schedule of group events
  const groupEvents: { time: number; type: 'reveal' | 'corrupt' | 'heal'; groupIndex: number }[] = [];

  // 1. Fast reveal schedule for each group (5x faster than effect cadence)
  for (let i = 0; i < groups.length; i++) {
    groupEvents.push({
      time: i * revealTick,
      type: 'reveal',
      groupIndex: i,
    });
  }

  // 2. Slower corruption and healing schedule for eligible groups (including final group & single group)
  if (granularity === 'char') {
    for (let i = 0; i < groups.length; i++) {
      const hasEligible = groups[i].words.some((w) => {
        const wChars = Array.from(w.querySelectorAll<HTMLElement>('.wim-char'));
        return wChars.some((wc) => {
          const cd = charDataList.find((x) => x.slot === wc);
          return cd && isEligible(cd.origText);
        });
      });

      if (!hasEligible) continue;

      // Ensure corruption occurs after reveal, running on the slower corruptionTick cadence
      const corruptTime = Math.max(i * revealTick + revealTick, (i + corruptAfterChunks) * corruptionTick);

      const hAfter = Array.isArray(healAfterChunks)
        ? Math.floor(Math.random() * (healAfterChunks[1] - healAfterChunks[0] + 1)) + healAfterChunks[0]
        : healAfterChunks;

      const healTime = corruptTime + hAfter * corruptionTick;

      groupEvents.push({ time: corruptTime, type: 'corrupt', groupIndex: i });
      groupEvents.push({ time: healTime, type: 'heal', groupIndex: i });
    }
  }

  groupEvents.sort((a, b) => a.time - b.time);

  let eventsCompleted = 0;
  const totalExpectedCompletions = groupEvents.length;

  function onEventDone() {
    eventsCompleted++;
    if (eventsCompleted >= totalExpectedCompletions) {
      if (!isCanceled) {
        // Guarantee all characters are restored to original text
        charDataList.forEach((cd) => {
          cd.current.textContent = cd.origText;
          cd.incoming.style.visibility = 'hidden';
          cd.incoming.textContent = '';
        });
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
          { duration: actualTravelDuration, easing, fill: 'forwards' }
        );

        const fadeTime = actualTravelDuration * 0.6;
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
        }, actualTravelDuration);
      }
    }

    if (actualMode === 'instant') {
      cd.current.textContent = newChar;
    }
  };

  groupEvents.forEach((ev) => {
    scheduleTimeout(() => {
      const group = groups[ev.groupIndex];

      if (ev.type === 'reveal') {
        // Complete line or chunk becomes visible instantly in its final position without any animation
        group.words.forEach((w) => {
          w.style.visibility = 'visible';
        });
        onEventDone();
      } else if (ev.type === 'corrupt' && granularity === 'char') {
        // Defensive check: ensure group is visible before corrupting
        group.words.forEach((w) => {
          w.style.visibility = 'visible';
        });

        const eligible: CharData[] = [];
        for (const w of group.words) {
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
                scheduleTimeout(onEventDone, actualTravelDuration);
              }
            }, i * actualLetterStagger);
          });
        }
      } else if (ev.type === 'heal' && granularity === 'char') {
        const toHeal: CharData[] = [];
        for (const w of group.words) {
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
                scheduleTimeout(onEventDone, actualTravelDuration);
              }
            }, i * actualLetterStagger);
          });
        }
      } else {
        onEventDone();
      }
    }, ev.time);
  });

  if (groupEvents.length === 0) {
    onEventDone();
  }

  return { finished, cancel };
}

/**
 * Chunked or line-by-line reveal with typo corruption and healing intro animation.
 *
 * When `revealBy: 'lines'` (default), text reveals one rendered horizontal line at a time.
 * When `revealBy: 'chunks'`, text reveals in word groups controlled by `chunkSize`.
 * Supports immediate execution or scroll-triggered ('enter' | 'leave') activation across one or multiple targets.
 */
export function chunkedScramble(target: Target, options?: ChunkedScrambleOptions): AnimationHandle {
  return runAnimationWithTrigger(target, options, runSingleChunkedScramble, 'intro');
}

