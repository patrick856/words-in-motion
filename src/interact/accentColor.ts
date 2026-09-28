import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
export interface AccentColorOptions extends BaseInteractOptions {
  /** Any CSS color. Defaults to #e11d48. */ accentColor?: string;
  /** Any CSS color. Defaults to each word's inherited color. */ baseColor?: string;
}
/** A proximity color wash that preserves the site's colors at rest. */
export function accentColor(target: Target, options?: AccentColorOptions): InteractHandle {
  const bases = new WeakMap<HTMLElement, string>();
  return createInteraction(target, options, ({ char, progress, options: opts }) => {
    if (!bases.has(char)) bases.set(char, options?.baseColor || getComputedStyle(char).color);
    if (progress <= 0) return { color: '' };
    const base = bases.get(char)!;
    const accent = options?.accentColor || '#e11d48';
    const amount = Math.min(1, progress * opts.strength) * 100;
    return { color: `color-mix(in srgb, ${base}, ${accent} ${amount}%)` };
  });
}
