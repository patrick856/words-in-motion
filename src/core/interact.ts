import type { BaseInteractOptions, InteractHandle, Target } from './types';
import { resolveElement, prefersReducedMotion } from './motion';
import { splitChars } from './split';
import { createCharMeasurer } from './measure';
import { observeVisibility } from './visibility';
import { subscribePointer, PointerState } from './pointer';
import { clamp, lerp } from './math';

export interface InteractUpdateContext {
  char: HTMLElement;
  index: number;
  total: number;
  dx: number;
  dy: number;
  distance: number;
  angle: number;
  progress: number; // 0..1 based on radius
  options: Required<BaseInteractOptions>;
}

export interface InteractCharStyles {
  /** Target transform string (e.g. 'translate3d(10px, 0, 0)') */
  transform?: string;
  /** Target opacity value (0..1) */
  opacity?: number;
  /** Target CSS filter string (e.g. 'blur(2px)') */
  filter?: string;

  // Optional numerical values for automatic smooth lerp interpolation
  translateX?: number;
  translateY?: number;
  scale?: number;
  rotate?: number;
}

export type InteractUpdateCallback = (ctx: InteractUpdateContext) => InteractCharStyles | void;

const DEFAULT_OPTIONS: Required<BaseInteractOptions> = {
  radius: 150,
  strength: 1,
  easing: 0.1,
  touch: 'follow',
  respectReducedMotion: true,
};

function createDummyInteractHandle(): InteractHandle {
  return {
    destroy: () => {},
    pause: () => {},
    resume: () => {},
  };
}

/**
 * Foundation factory for creating cursor-reactive typographic interactions.
 */
export function createInteraction(
  target: Target,
  options?: BaseInteractOptions,
  update?: InteractUpdateCallback
): InteractHandle {
  const element = resolveElement(target);
  if (!element) {
    return createDummyInteractHandle();
  }

  const opts: Required<BaseInteractOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const isReducedMotion = opts.respectReducedMotion && prefersReducedMotion();

  // Split text into character spans
  const { chars, revert } = splitChars(element);
  if (chars.length === 0) {
    return createDummyInteractHandle();
  }

  // Position measurer & visibility observer
  const measurer = createCharMeasurer(element, chars);
  let isVisible = true;
  const unobserveVisibility = observeVisibility(element, (visible) => {
    isVisible = visible;
  });

  let isPaused = false;

  // Track per-character interpolated numerical state
  const charStates = chars.map(() => ({
    currX: 0,
    currY: 0,
    currScale: 1,
    currRotate: 0,
    currOpacity: 1,
  }));

  const handlePointerFrame = (pointer: PointerState) => {
    if (isPaused || !isVisible) return;

    // Check touch behavior
    let pointerActive = pointer.isActive;
    if (pointer.isTouch) {
      if (opts.touch === 'none') {
        pointerActive = false;
      } else if (opts.touch === 'tap' && !pointer.isActive) {
        pointerActive = false;
      }
    }

    // Single container bounding rect call per frame
    const containerRect = element.getBoundingClientRect();

    for (let i = 0; i < chars.length; i++) {
      const charEl = chars[i];
      const measure = measurer.getMeasures()[i] || { x: 0, y: 0 };
      const charClientX = containerRect.left + measure.x;
      const charClientY = containerRect.top + measure.y;

      const dx = pointer.x - charClientX;
      const dy = pointer.y - charClientY;
      const dist = Math.hypot(dx, dy);
      const angleVal = Math.atan2(dy, dx);
      const rawProgress = pointerActive ? clamp(1 - dist / opts.radius, 0, 1) : 0;
      const progress = isReducedMotion ? 0 : rawProgress;

      let targetStyles: InteractCharStyles | void = undefined;

      if (update) {
        targetStyles = update({
          char: charEl,
          index: i,
          total: chars.length,
          dx,
          dy,
          distance: dist,
          angle: angleVal,
          progress,
          options: opts,
        });
      }

      // Process style updates
      if (targetStyles) {
        const state = charStates[i];

        // Numerical lerp if provided
        const targetX = (targetStyles.translateX ?? 0) * (isReducedMotion ? 0 : 1);
        const targetY = (targetStyles.translateY ?? 0) * (isReducedMotion ? 0 : 1);
        const targetScale = isReducedMotion ? 1 : (targetStyles.scale ?? 1);
        const targetRotate = (targetStyles.rotate ?? 0) * (isReducedMotion ? 0 : 1);
        const targetOpacity = targetStyles.opacity ?? 1;

        state.currX = lerp(state.currX, targetX, opts.easing);
        state.currY = lerp(state.currY, targetY, opts.easing);
        state.currScale = lerp(state.currScale, targetScale, opts.easing);
        state.currRotate = lerp(state.currRotate, targetRotate, opts.easing);
        state.currOpacity = lerp(state.currOpacity, targetOpacity, opts.easing);

        let transformStr = targetStyles.transform;
        if (!transformStr && (state.currX || state.currY || state.currScale !== 1 || state.currRotate)) {
          transformStr = `translate3d(${state.currX.toFixed(2)}px, ${state.currY.toFixed(2)}px, 0) scale(${state.currScale.toFixed(3)}) rotate(${state.currRotate.toFixed(2)}deg)`;
        }

        if (transformStr !== undefined) {
          charEl.style.transform = transformStr;
        }
        if (targetStyles.opacity !== undefined || state.currOpacity !== 1) {
          charEl.style.opacity = state.currOpacity.toFixed(3);
        }
        if (targetStyles.filter !== undefined) {
          charEl.style.filter = targetStyles.filter;
        }
      }
    }
  };

  const unsubscribePointer = subscribePointer(handlePointerFrame);

  const destroy = () => {
    unsubscribePointer();
    unobserveVisibility();
    measurer.destroy();
    revert();
  };

  const pause = () => {
    isPaused = true;
  };

  const resume = () => {
    isPaused = false;
  };

  return {
    destroy,
    pause,
    resume,
  };
}
