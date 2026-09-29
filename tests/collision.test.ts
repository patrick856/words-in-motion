import { describe, expect, it } from 'vitest';
import { resolveLetterContacts, type LetterBody, type CursorBody } from '../src/core/collision';
const row = (count: number, y = 0): LetterBody[] =>
  Array.from({ length: count }, (_, i) => ({
    x: i * 10,
    y,
    homeX: i * 10,
    homeY: y,
    width: 10,
    height: 20,
  }));
function expectNoOverlaps(bodies: LetterBody[], tolerance = 0.01) {
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i],
        b = bodies[j];
      const x = (a.width + b.width) / 2 - Math.abs(a.x - b.x);
      const y = (a.height + b.height) / 2 - Math.abs(a.y - b.y);
      expect(Math.min(x, y), `letters ${i},${j} overlap`).toBeLessThanOrEqual(tolerance);
    }
}
function expectOutsideCursor(bodies: LetterBody[], cursor: CursorBody) {
  for (const body of bodies) {
    const x = Math.max(body.x - body.width / 2, Math.min(cursor.x, body.x + body.width / 2));
    const y = Math.max(body.y - body.height / 2, Math.min(cursor.y, body.y + body.height / 2));
    expect(Math.hypot(x - cursor.x, y - cursor.y)).toBeGreaterThanOrEqual(cursor.radius - 0.01);
  }
}
describe('letter contact solver', () => {
  it('a point cursor leaves nearby letters and exact-edge contacts still', () => {
    for (const cursor of [
      { x: 6, y: 0, radius: 0 },
      { x: 5, y: 0, radius: 0 },
      { x: 0, y: -11, radius: 0 },
    ]) {
      const bodies = row(1);
      const original = structuredClone(bodies);
      resolveLetterContacts(bodies, cursor);
      expect(bodies).toEqual(original);
    }
  });
  it('a point cursor inside a letter displaces it only as far as contact requires', () => {
    const bodies = row(1);
    resolveLetterContacts(bodies, { x: -4, y: 0, radius: 0 });
    expect(bodies[0].x).toBe(1);
    expect(bodies[0].y).toBe(0);
  });
  it('preserves untouched resting typography', () => {
    const bodies = row(20);
    const original = structuredClone(bodies);
    resolveLetterContacts(bodies);
    expect(bodies).toEqual(original);
  });
  it.each([
    { x: 145, y: 0, radius: 22 },
    { x: 150, y: 8, radius: 22 },
    { x: 2, y: -15, radius: 15 },
  ])('passes cursor contact through a dense row: %j', (cursor) => {
    const bodies = row(30);
    resolveLetterContacts(bodies, cursor);
    expectNoOverlaps(bodies);
    expectOutsideCursor(bodies, cursor);
    expect(bodies.some((b) => Math.abs(b.x - b.homeX) > 1)).toBe(true);
  });
  it('resolves contact between three wrapped lines and the cursor', () => {
    const bodies = [...row(16, 0), ...row(16, 24), ...row(16, 48)];
    const cursor = { x: 62, y: 24, radius: 22 };
    resolveLetterContacts(bodies, cursor);
    expectNoOverlaps(bodies);
    expectOutsideCursor(bodies, cursor);
  });
  it('resolves letters compressed by a pull field', () => {
    const bodies = row(200);
    bodies.forEach((b) => {
      b.x = 95 + (b.x - 95) * 0.7;
    });
    resolveLetterContacts(bodies);
    expectNoOverlaps(bodies);
  });
  it('uses circle/rectangle contact, so a cursor touching a glyph edge pushes it', () => {
    const bodies = row(1);
    const cursor = { x: 14, y: 0, radius: 10 };
    resolveLetterContacts(bodies, cursor);
    expect(bodies[0].x).toBeLessThan(0);
    expectOutsideCursor(bodies, cursor);
  });
  it('does not disturb intentional negative tracking at rest', () => {
    const bodies = row(3);
    bodies.forEach((b, i) => {
      b.x = b.homeX = i * 9;
    });
    const original = structuredClone(bodies);
    resolveLetterContacts(bodies);
    expect(bodies).toEqual(original);
  });
});
