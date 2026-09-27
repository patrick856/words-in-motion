import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';

export interface AccentColorOptions extends BaseInteractOptions {
  /** Accent color to transition toward on proximity. Defaults to '#e11d48'. */
  accentColor?: string;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Proximity accent-color fill cursor interact effect.
 * Interpolates character color toward a configurable accent color proportional to cursor proximity.
 */
export function accentColor(
  target: Target,
  options?: AccentColorOptions
): InteractHandle {
  const accent = options?.accentColor ?? '#e11d48';

  return createInteraction(target, options, ({ char, progress }) => {
    if (progress <= 0) {
      char.style.color = '';
      return;
    }

    const targetRgb = parseHex(accent);
    // Render accent color transition via CSS color property or filter
    char.style.color = `rgba(${targetRgb.r}, ${targetRgb.g}, ${targetRgb.b}, ${progress.toFixed(2)})`;
  });
}
