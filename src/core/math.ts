/**
 * Linearly interpolates between start and end by t (0..1).
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Clamps a value between a minimum and maximum bound.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Calculates Euclidean distance between two points (x1, y1) and (x2, y2).
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Calculates the angle in radians between point (x1, y1) and point (x2, y2).
 */
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Maps a value from one range [inMin, inMax] to another range [outMin, outMax].
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMin === inMax) return outMin;
  const progress = (value - inMin) / (inMax - inMin);
  return outMin + progress * (outMax - outMin);
}
