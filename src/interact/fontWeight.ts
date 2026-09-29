import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { bounded } from '../core/effect';
export interface FontWeightOptions extends BaseInteractOptions {
  /** Baseline weight. Defaults to the text's computed font weight. */ minWeight?: number;
  /** Weight at the center of the focus radius. Defaults to 800. */ maxWeight?: number;
  /** Maximum distance for bolding the nearest word. Defaults to 56px. */ focusRadius?: number;
}
/** Proximity weight modulation; inherits the site's baseline typography. */
export function fontWeight(target: Target, options?: FontWeightOptions): InteractHandle {
  const bases = new WeakMap<HTMLElement, number>();
  const focusRadius = bounded(options?.focusRadius, 56, 1, 1000);
  return createInteraction(target, options, ({ char, progress, nearestWord, nearestDistance, options: opts }) => {
    if (!nearestWord || nearestDistance > focusRadius || char.closest('.wim-word') !== nearestWord)
      return { fontWeight: '' };
    if (!bases.has(char))
      bases.set(
        char,
        bounded(options?.minWeight, parseFloat(getComputedStyle(char).fontWeight) || 400, 1, 1000)
      );
    const base = bases.get(char)!;
    const peak = bounded(options?.maxWeight, 800, 1, 1000);
    const proximity = Math.max(0, Math.min(1, 1 - nearestDistance / focusRadius));
    const amount = Math.min(1, proximity * opts.strength);
    return {
      fontWeight:
        progress <= 0 && options?.minWeight === undefined
          ? ''
          : base + (peak - base) * amount,
    };
  });
}
