import { directionalReveal } from '../src/intro/directionalReveal';
import { lampFlicker } from '../src/intro/lampFlicker';
import { rise } from '../src/intro/rise';
import { chunkedScramble } from '../src/intro/chunkedScramble';
import { stripRealign } from '../src/intro/stripRealign';

import { blackHole } from '../src/outro/blackHole';
import { paperCut } from '../src/outro/paperCut';
import { portal } from '../src/outro/portal';
import { breakAndFade } from '../src/outro/breakAndFade';
import { portalReverse } from '../src/outro/portalReverse';

import { waveRelay } from '../src/scroll/waveRelay';
import { readingLine } from '../src/scroll/readingLine';
import { scatterReassemble } from '../src/scroll/scatterReassemble';

import { pull } from '../src/interact/pull';
import { push } from '../src/interact/push';
import { proximityFade } from '../src/interact/proximityFade';
import { proximityFlip } from '../src/interact/proximityFlip';
import { proximityShake } from '../src/interact/proximityShake';
import { obstaclePush } from '../src/interact/obstaclePush';
import { fontWeight } from '../src/interact/fontWeight';
import { accentColor } from '../src/interact/accentColor';

export interface AnimationEntry {
  name: string;
  category: 'intro' | 'loop' | 'outro' | 'interact' | 'scroll';
  run: (
    el: HTMLElement
  ) =>
    | {
        finished?: Promise<void>;
        cancel?: () => void;
        destroy?: () => void;
        pause?: () => void;
        resume?: () => void;
      }
    | void;
}

/**
 * Registry of available animations for the playground demo gallery.
 */
export const registry: AnimationEntry[] = [
  // Intro animations
  { name: 'directionalReveal', category: 'intro', run: (el) => directionalReveal(el) },
  { name: 'lampFlicker', category: 'intro', run: (el) => lampFlicker(el) },
  { name: 'rise', category: 'intro', run: (el) => rise(el) },
  { name: 'chunkedScramble', category: 'intro', run: (el) => chunkedScramble(el) },
  { name: 'stripRealign', category: 'intro', run: (el) => stripRealign(el) },

  // Outro animations
  { name: 'blackHole', category: 'outro', run: (el) => blackHole(el) },
  { name: 'paperCut', category: 'outro', run: (el) => paperCut(el) },
  { name: 'portal', category: 'outro', run: (el) => portal(el) },
  { name: 'breakAndFade', category: 'outro', run: (el) => breakAndFade(el) },
  { name: 'portalReverse', category: 'outro', run: (el) => portalReverse(el) },

  // Scroll animations
  { name: 'waveRelay', category: 'scroll', run: (el) => waveRelay(el) },
  { name: 'readingLine', category: 'scroll', run: (el) => readingLine(el) },
  { name: 'scatterReassemble', category: 'scroll', run: (el) => scatterReassemble(el) },

  // Interact / Cursor effects
  { name: 'pull', category: 'interact', run: (el) => pull(el) },
  { name: 'push', category: 'interact', run: (el) => push(el) },
  { name: 'proximityFade', category: 'interact', run: (el) => proximityFade(el) },
  { name: 'proximityFlip', category: 'interact', run: (el) => proximityFlip(el) },
  { name: 'proximityShake', category: 'interact', run: (el) => proximityShake(el) },
  { name: 'obstaclePush', category: 'interact', run: (el) => obstaclePush(el) },
  { name: 'fontWeight', category: 'interact', run: (el) => fontWeight(el) },
  { name: 'accentColor', category: 'interact', run: (el) => accentColor(el) },
];
