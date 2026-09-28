import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { bounded } from '../core/effect';
export interface FontWeightOptions extends BaseInteractOptions {
  /** Baseline weight. Defaults to the text's computed font weight. */ minWeight?: number;
  /** Peak weight. Defaults to 800. Variable fonts provide smooth interpolation. */ maxWeight?: number;
}
/** Proximity weight modulation; inherits the site's baseline typography. */
export function fontWeight(target: Target, options?: FontWeightOptions): InteractHandle {
  const bases = new WeakMap<HTMLElement, number>();
  return createInteraction(target, options, ({ char, progress, options: opts }) => {
    if (!bases.has(char))
      bases.set(
        char,
        bounded(options?.minWeight, parseFloat(getComputedStyle(char).fontWeight) || 400, 1, 1000)
      );
    const base = bases.get(char)!;
    const peak = bounded(options?.maxWeight, 800, 1, 1000);
    return {
      fontWeight:
        progress <= 0 && options?.minWeight === undefined
          ? ''
          : base + (peak - base) * Math.min(1, progress * opts.strength),
    };
  });
}
