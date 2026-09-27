import type { AnimationHandle, Target } from '../core/types';
import { portal, PortalOptions } from './portal';

/**
 * Train to the portal (reverse) outro animation.
 * Reuses the portal motion mechanic in reverse mode to exit the way an intro version enters.
 */
export function portalReverse(
  target: Target,
  options?: PortalOptions
): AnimationHandle {
  const reverseDirection =
    options?.direction === 'left'
      ? 'right'
      : options?.direction === 'right'
      ? 'left'
      : 'vanishing-point';

  return portal(target, {
    ...options,
    direction: reverseDirection,
  });
}
