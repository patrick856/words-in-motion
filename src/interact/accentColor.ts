import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';
import { lerp } from '../core/math';

export interface AccentColorOptions extends BaseInteractOptions {
  /** Target accent color hex code on proximity. Defaults to '#e11d48'. */
  accentColor?: string;
  /** Initial base text color hex code. Defaults to '#1c1917'. */
  baseColor?: string;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c || '000000', 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Proximity accent-color fill cursor interact effect.
 * Smoothly interpolates numerical RGB values from base color to accent color proportional to cursor proximity.
 */
export function accentColor(
  target: Target,
  options?: AccentColorOptions
): InteractHandle {
  const accentHex = options?.accentColor ?? '#e11d48';
  const baseHex = options?.baseColor ?? '#1c1917';

  const targetRgb = parseHex(accentHex);
  const baseRgb = parseHex(baseHex);

  return createInteraction(target, options, ({ char, progress }) => {
    if (progress <= 0) {
      char.style.color = '';
      return { color: '' };
    }

    const r = Math.round(lerp(baseRgb.r, targetRgb.r, progress));
    const g = Math.round(lerp(baseRgb.g, targetRgb.g, progress));
    const b = Math.round(lerp(baseRgb.b, targetRgb.b, progress));

    const color = `rgb(${r}, ${g}, ${b})`;
    char.style.color = color;
    return { color };
  });
}
