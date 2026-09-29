import type { AnimationHandle } from './types';

/** Finite, bounded public numeric options. */
export function bounded(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

// Exclusive DOM ownership for effects that split or replace text. Cursor effects
// still compose through createInteraction's own instance manager.
function ownersFor(element: HTMLElement): WeakMap<HTMLElement, () => void> {
  // Subpath bundles can contain separate copies of this module. Store ownership
  // lazily on the document so those copies still cancel each other correctly.
  const ownerKey = Symbol.for('words-in-motion.effect-owners');
  const host = element.ownerDocument as Document & {
    [key: symbol]: WeakMap<HTMLElement, () => void> | undefined;
  };
  return (host[ownerKey] ??= new WeakMap());
}
export function stopEffect(element: HTMLElement): void {
  ownersFor(element).get(element)?.();
}
export function ownEffect(element: HTMLElement, cancel: () => void): () => void {
  const owners = ownersFor(element);
  owners.set(element, cancel);
  return () => {
    if (owners.get(element) === cancel) owners.delete(element);
  };
}

/** Settles cancellation without leaking WAAPI AbortError rejections. */
export function animationGroup(
  animations: Animation[],
  cleanup: (completed: boolean) => void,
  loop = false
): AnimationHandle {
  let settled = false;
  let resolve!: () => void;
  const finished = new Promise<void>((r) => {
    resolve = r;
  });
  const settle = (completed: boolean) => {
    if (settled) return;
    settled = true;
    animations.forEach((animation) => animation.cancel());
    cleanup(completed);
    resolve();
  };
  void Promise.all(animations.map((a) => a.finished)).then(
    () => {
      if (!loop) settle(true);
    },
    () => settle(false)
  );
  return { finished, cancel: () => settle(false) };
}
