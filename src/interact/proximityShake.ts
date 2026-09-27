import type { BaseInteractOptions, InteractHandle, Target } from '../core/types';
import { createInteraction } from '../core/interact';

export interface ProximityShakeOptions extends BaseInteractOptions {
  /** Maximum shake oscillation amplitude in pixels. Defaults to 8. */
  maxAmplitude?: number;
}

/**
 * Proximity shake cursor interact effect.
 * Oscillates/shakes characters with amplitude scaling with cursor proximity.
 */
export function proximityShake(
  target: Target,
  options?: ProximityShakeOptions
): InteractHandle {
  const maxAmplitude = options?.maxAmplitude ?? 8;

  return createInteraction(target, options, ({ index, progress }) => {
    if (progress <= 0) {
      return { translateX: 0, translateY: 0, rotate: 0 };
    }

    const time = Date.now() * 0.02;
    const freq = 1 + (index % 3) * 0.5;
    const amplitude = progress * maxAmplitude;

    const shakeX = Math.sin(time * freq + index) * amplitude;
    const shakeY = Math.cos(time * freq * 1.2 + index) * amplitude;
    const shakeRot = Math.sin(time + index) * (progress * 12);

    return {
      translateX: shakeX,
      translateY: shakeY,
      rotate: shakeRot,
    };
  });
}
