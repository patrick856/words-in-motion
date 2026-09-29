import type { BaseScrollScrubOptions, ScrollScrubHandle, Target } from '../core/types';
import { createScrollScrub } from '../core/scrollHelpers';
import { bounded } from '../core/effect';
export interface WaveRelayOptions extends BaseScrollScrubOptions {
  targetCharIndex?: number;
  pushStrength?: number;
  waveHeight?: number;
  waveRadius?: number;
}
/** A traveling letter follows reading order across wrapped lines, gently parting nearby text. */
export function waveRelay(target: Target, options?: WaveRelayOptions): ScrollScrubHandle {
  const push = bounded(options?.pushStrength, 18, 0, 200);
  const height = bounded(options?.waveHeight, 8, 0, 200);
  const radius = bounded(options?.waveRadius, 45, 1, 1000);
  const smoothstep = (value: number) => {
    const t = bounded(value, 0, 0, 1);
    return t * t * (3 - 2 * t);
  };
  return createScrollScrub(target, options, ({ progress, index, total, measures }) => {
    const raw = Math.trunc(bounded(options?.targetCharIndex, -1, -total, total - 1));
    const active = raw < 0 ? total + raw : raw;
    const first = measures[0] ?? { x: 0, y: 0 };
    const last = measures[active] ?? first;
    // The relay cuts diagonally from the first glyph to the destination glyph,
    // following the straight line between them across wrapped lines.
    const x = first.x + (last.x - first.x) * progress;
    const y = first.y + (last.y - first.y) * progress;
    const me = measures[index] ?? { x: 0, y: 0 };
    if (index === active) return { translateX: x - me.x, translateY: y - me.y };
    const dx = me.x - x;
    const dy = me.y - y;
    const distance = Math.hypot(dx, dy);
    const near = Math.max(0, 1 - distance / radius);
    // Start at full power, then ease out over the final word.
    let trailingWordUnits = 1;
    const finalWord = measures[active]?.element.closest('.wim-word');
    if (finalWord) {
      for (let cursor = active - 1; cursor >= 0; cursor--) {
        if (measures[cursor]?.element.closest('.wim-word') !== finalWord) break;
        trailingWordUnits++;
      }
    }
    const endFadeStart = Math.max(0, 1 - trailingWordUnits / Math.max(active, 1));
    const endFadeProgress = (progress - endFadeStart) / Math.max(1 - endFadeStart, 0.0001);
    const powerOut = 1 - smoothstep(endFadeProgress);
    const power = powerOut;
    const influence = near * near * (3 - 2 * near) * power;
    // Signed distance naturally crosses zero as the relay passes a letter.
    // Normalizing this vector would force an arbitrary direction at distance 0
    // and create the visible one-frame shove that looks like a teleport.
    return {
      translateX: (dx / radius) * push * influence,
      translateY: (dy / radius) * push * influence - height * influence,
    };
  });
}
