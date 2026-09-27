import type { AnimationHandle, BaseOptions, Target } from '../core/types';
import { resolveElement, prefersReducedMotion, createDummyHandle } from '../core/motion';

export interface PortalOptions extends BaseOptions {
  /** Direction in which the portal motion pulls the text block. Defaults to 'right'. */
  direction?: 'left' | 'right' | 'vanishing-point';
  /** Whether to keep text hidden or restore original state after completion. Defaults to false. */
  keep?: boolean;
}

/**
 * Train to the portal outro animation.
 * Animates the entire text block as a single unified unit sliding into a portal vanishing point.
 */
export function portal(
  target: Target,
  options?: PortalOptions
): AnimationHandle {
  const element = resolveElement(target);
  if (!element) {
    return createDummyHandle();
  }

  if (prefersReducedMotion()) {
    element.style.opacity = '0';
    return createDummyHandle();
  }

  const {
    direction = 'right',
    duration = 600,
    easing = 'cubic-bezier(0.7, 0, 0.84, 0)',
    keep = false,
  } = options || {};

  const rect = element.getBoundingClientRect();
  const moveX = direction === 'left' ? -rect.width - 100 : direction === 'right' ? rect.width + 100 : 0;
  const targetScale = direction === 'vanishing-point' ? 0.05 : 0.8;

  const keyframes: Keyframe[] = [
    { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
    {
      opacity: 0,
      transform:
        direction === 'vanishing-point'
          ? `scale(${targetScale}) translate3d(0, 0, 0)`
          : `translate3d(${moveX}px, 0, 0) scale(${targetScale})`,
    },
  ];

  let finished: Promise<void>;
  let cancelFunc = () => {};

  if (typeof element.animate === 'function') {
    const anim = element.animate(keyframes, {
      duration,
      easing,
      fill: 'forwards',
    });

    finished = anim.finished.then(() => {
      if (!keep) {
        element.style.opacity = '0';
      }
    });

    cancelFunc = () => {
      anim.cancel();
      element.style.opacity = '';
    };
  } else {
    element.style.opacity = '0';
    finished = Promise.resolve();
  }

  return { finished, cancel: cancelFunc };
}
