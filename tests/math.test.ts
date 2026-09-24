import { describe, it, expect } from 'vitest';
import { lerp, clamp, distance, angle, mapRange } from '../src/core/math';

describe('Math Helpers (core/math.ts)', () => {
  it('lerp interpolates correctly', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(10, 20, 0.1)).toBeCloseTo(11);
    expect(lerp(0, 50, 0)).toBe(0);
    expect(lerp(0, 50, 1)).toBe(50);
  });

  it('clamp restricts values within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('distance calculates Euclidean distance', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
    expect(distance(1, 1, 1, 1)).toBe(0);
  });

  it('angle calculates angle in radians', () => {
    expect(angle(0, 0, 1, 0)).toBe(0);
    expect(angle(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2);
  });

  it('mapRange maps values between ranges', () => {
    expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
    expect(mapRange(0, 0, 10, 20, 30)).toBe(20);
    expect(mapRange(10, 0, 10, 20, 30)).toBe(30);
  });
});
