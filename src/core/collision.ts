/** Layout-space rectangles. Positions are centers; home positions never change during a frame. */
export interface LetterBody {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  width: number;
  height: number;
  homeWidth?: number;
  homeHeight?: number;
}

export interface CursorBody {
  x: number;
  y: number;
  radius: number;
}

/** Project a letter out of a solid circular cursor, including cursor-inside-letter contact. */
function cursorContact(body: LetterBody, cursor: CursorBody): number {
  const halfW = body.width / 2;
  const halfH = body.height / 2;
  const dx = body.x - cursor.x;
  const dy = body.y - cursor.y;
  const nearestX = Math.max(body.x - halfW, Math.min(cursor.x, body.x + halfW));
  const nearestY = Math.max(body.y - halfH, Math.min(cursor.y, body.y + halfH));
  const nx = nearestX - cursor.x;
  const ny = nearestY - cursor.y;
  const distance = Math.hypot(nx, ny);
  // A zero-radius cursor is a point: only penetration into the letter's
  // bounds causes displacement. Points outside or exactly on an edge do not.
  if (cursor.radius === 0 ? distance > 0 : distance >= cursor.radius) return 0;
  if (distance > 0.0001) {
    const depth = cursor.radius - distance;
    body.x += (nx / distance) * depth;
    body.y += (ny / distance) * depth;
    return depth;
  }
  const px = halfW + cursor.radius - Math.abs(dx);
  const py = halfH + cursor.radius - Math.abs(dy);
  if (px <= py) body.x += (Math.sign(dx) || Math.sign(body.homeX - cursor.x) || 1) * px;
  else body.y += (Math.sign(dy) || Math.sign(body.homeY - cursor.y) || -1) * py;
  return Math.min(px, py);
}

/**
 * Resolve contacts after interpolation, so even intermediate frames cannot simply
 * lerp through neighboring letters. Broad-phase buckets keep paragraphs practical.
 * The original layout's intentional overlaps (e.g. negative tracking) are retained.
 */
export function resolveLetterContacts(bodies: LetterBody[], cursor?: CursorBody): void {
  if (!bodies.length) return;
  const cellSize = bodies.reduce((size, body) => Math.max(size, body.width, body.height), 16);
  const centerX = bodies.reduce((sum, body) => sum + body.x, 0) / bodies.length;
  const centerY = bodies.reduce((sum, body) => sum + body.y, 0) / bodies.length;
  const rows: LetterBody[][] = [];
  for (const body of bodies) {
    const row = rows.find(
      (row) =>
        Math.abs(row[0].homeY - body.homeY) <
        Math.max(
          1,
          Math.min(row[0].homeHeight ?? row[0].height, body.homeHeight ?? body.height) * 0.45
        )
    );
    if (row) row.push(body);
    else rows.push([body]);
  }
  rows.forEach((row) => row.sort((a, b) => a.homeX - b.homeX));
  const iterations = Math.min(80, Math.max(16, bodies.length * 2));
  for (let pass = 0; pass < iterations; pass++) {
    let correction = 0;
    if (cursor)
      for (const body of bodies) correction = Math.max(correction, cursorContact(body, cursor));
    // Ordered neighboring cells retain their reading-row order while touching.
    // This also projects compressed long words without slow iterative diffusion.
    for (const row of rows)
      for (let step = 1; step < row.length; step++) {
        const index = pass % 2 ? row.length - step : step;
        const a = row[index - 1],
          b = row[index];
        const vertical = (a.height + b.height) / 2 - Math.abs(a.y - b.y);
        if (vertical <= 0) continue;
        const homeGap = b.homeX - a.homeX;
        const minimum = Math.min(
          homeGap,
          ((a.homeWidth ?? a.width) + (b.homeWidth ?? b.width)) / 2
        );
        const growth =
          (a.width - (a.homeWidth ?? a.width) + (b.width - (b.homeWidth ?? b.width))) / 2;
        const depth = minimum + growth - (b.x - a.x);
        if (depth <= 0) continue;
        const anchor = cursor?.x ?? centerX;
        const da = Math.abs(a.x - anchor),
          db = Math.abs(b.x - anchor);
        const share = da > db ? 1 : da < db ? 0 : 0.5;
        a.x -= depth * share;
        b.x += depth * (1 - share);
        correction = Math.max(correction, depth);
      }
    const cells = new Map<string, number[]>();
    // Rebuild every pass because resolving one contact can create another.
    for (let step = 0; step < bodies.length; step++) {
      // Alternating sweeps propagate contact both ways through long rows in a
      // few passes, rather than advancing one neighbor per iteration.
      const i = pass % 2 ? bodies.length - 1 - step : step;
      const a = bodies[i];
      const cellX = Math.floor(a.x / cellSize);
      const cellY = Math.floor(a.y / cellSize);
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          for (const j of cells.get(`${cellX + ox},${cellY + oy}`) ?? []) {
            const b = bodies[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const homeOverlapX =
              (a.homeWidth ?? a.width) / 2 +
              (b.homeWidth ?? b.width) / 2 -
              Math.abs(b.homeX - a.homeX);
            const homeOverlapY =
              (a.homeHeight ?? a.height) / 2 +
              (b.homeHeight ?? b.height) / 2 -
              Math.abs(b.homeY - a.homeY);
            const restingOverlap = homeOverlapX > 0 && homeOverlapY > 0;
            const px = (a.width + b.width) / 2 - Math.abs(dx) - (restingOverlap ? homeOverlapX : 0);
            const py =
              (a.height + b.height) / 2 - Math.abs(dy) - (restingOverlap ? homeOverlapY : 0);
            if (px <= 0 || py <= 0) continue;
            const horizontal = px <= py;
            const depth = horizontal ? px : py;
            const sign = horizontal
              ? Math.sign(dx) || Math.sign(b.homeX - a.homeX) || 1
              : Math.sign(dy) || Math.sign(b.homeY - a.homeY) || 1;
            // Push the outer neighbor onward. A half/half solver converges too
            // slowly for long touching rows and leaves visible compression.
            const anchor = horizontal ? (cursor?.x ?? centerX) : (cursor?.y ?? centerY);
            const da = Math.abs((horizontal ? a.x : a.y) - anchor);
            const db = Math.abs((horizontal ? b.x : b.y) - anchor);
            const shareA = da > db ? 1 : da < db ? 0 : 0.5;
            if (horizontal) {
              a.x -= sign * depth * shareA;
              b.x += sign * depth * (1 - shareA);
            } else {
              a.y -= sign * depth * shareA;
              b.y += sign * depth * (1 - shareA);
            }
            correction = Math.max(correction, depth);
          }
        }
      const key = `${Math.floor(a.x / cellSize)},${Math.floor(a.y / cellSize)}`;
      const list = cells.get(key) ?? [];
      list.push(i);
      cells.set(key, list);
    }
    if (correction < 0.0001) break;
  }
}
