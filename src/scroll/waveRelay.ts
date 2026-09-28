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
  const push = bounded(options?.pushStrength, 14, 0, 200);
  const height = bounded(options?.waveHeight, 8, 0, 200);
  const radius = bounded(options?.waveRadius, 45, 1, 1000);
  return createScrollScrub(target, options, ({ progress, index, total, measures }) => {
    const raw = Math.trunc(bounded(options?.targetCharIndex, -1, -total, total - 1));
    const active = raw < 0 ? total + raw : raw;
    const t = progress * active;
    const left = Math.floor(t);
    const a = measures[left] ?? { x: 0, y: 0 };
    const b = measures[Math.min(active, left + 1)] ?? a;
    const x = a.x + (b.x - a.x) * (t - left);
    const y = a.y + (b.y - a.y) * (t - left);
    const me = measures[index] ?? { x: 0, y: 0 };
    if (index === active) return { translateX: x - me.x, translateY: y - me.y };
    const dx = me.x - x;
    const dy = me.y - y;
    const distance = Math.hypot(dx, dy);
    const near = Math.max(0, 1 - distance / radius);
    // Fade the influence at both ends so the complete text rests exactly in place.
    const envelope = Math.sin(Math.PI * progress);
    const influence = near * near * (3 - 2 * near) * (progress === 1 ? 0 : envelope);
    return {
      translateX: (distance ? dx / distance : 1) * push * influence,
      translateY: (distance ? dy / distance : 0) * push * influence - height * influence,
    };
  });
}
