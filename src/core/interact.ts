import type { BaseInteractOptions, InteractHandle, Target } from './types';
import { resolveElements, prefersReducedMotion } from './motion';
import { splitChars } from './split';
import { createCharMeasurer, MeasurerHandle } from './measure';
import { observeVisibility } from './visibility';
import { subscribePointer, getPointerState, PointerState } from './pointer';
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
  /** Target text color */
  color?: string;
  /** Target font weight */
  fontWeight?: string | number;

  // Numerical values for automatic smooth lerp interpolation and transform composition
  translateX?: number;
  translateY?: number;
  scale?: number;
  rotate?: number;
  rotateX?: number;
  rotateY?: number;
}

export type InteractUpdateCallback = (ctx: InteractUpdateContext) => InteractCharStyles | void;

const DEFAULT_OPTIONS: Required<BaseInteractOptions> = {
  radius: 150,
  strength: 1,
  easing: 0.1,
  touch: 'follow',
  respectReducedMotion: true,
  pointerArea: 'viewport',
};

interface InstanceCharState {
  currX: number;
  currY: number;
  currScale: number;
  currRotate: number;
  currRotateX: number;
  currRotateY: number;
  currOpacity: number;
  hasTransform: boolean;
  extraTransform: string;
  hasOpacity: boolean;
  filter: string;
  color: string;
  fontWeight: string;
}

interface InteractionInstance {
  id: number;
  element: HTMLElement;
  options: Required<BaseInteractOptions>;
  update?: InteractUpdateCallback;
  charStates: InstanceCharState[];
  isPaused: boolean;
}

interface ElementContext {
  element: HTMLElement;
  chars: HTMLElement[];
  revert: () => void;
  measurer: MeasurerHandle;
  unobserveVisibility: () => void;
  isVisible: boolean;
  instances: Set<InteractionInstance>;
  hasCustomColor: boolean;
  hasCustomFontWeight: boolean;
  renderComposed: (pointer: PointerState) => void;
}

// Global registry of elements that have active interaction instances
const elementContexts = new Map<HTMLElement, ElementContext>();
let unsubscribePointer: (() => void) | null = null;
let instanceIdCounter = 0;

function onGlobalPointerTick(pointer: PointerState) {
  for (const ctx of elementContexts.values()) {
    ctx.renderComposed(pointer);
  }
}

function ensurePointerSubscribed() {
  if (!unsubscribePointer) {
    unsubscribePointer = subscribePointer(onGlobalPointerTick);
  }
}

function checkPointerTeardown() {
  if (elementContexts.size === 0 && unsubscribePointer) {
    unsubscribePointer();
    unsubscribePointer = null;
  }
}

function createDummyInteractHandle(): InteractHandle {
  const noop = () => {};
  return {
    destroy: noop,
    cancel: noop,
    pause: noop,
    resume: noop,
  };
}

function createComposedRenderer(ctx: ElementContext): (pointer: PointerState) => void {
  const { element, chars, measurer, instances } = ctx;

  return (pointer: PointerState) => {
    if (!ctx.isVisible || instances.size === 0) return;

    // Single bounding rect evaluation for this element per frame
    const containerRect = element.getBoundingClientRect();
    const measures = measurer.getMeasures();

    let elementHasCustomColor = false;
    let elementHasCustomFontWeight = false;

    // Compose effects per character
    for (let i = 0; i < chars.length; i++) {
      const charEl = chars[i];
      const measure = measures[i] || { x: 0, y: 0 };
      const charClientX = containerRect.left + measure.x;
      const charClientY = containerRect.top + measure.y;

      const dx = pointer.x - charClientX;
      const dy = pointer.y - charClientY;
      const dist = Math.hypot(dx, dy);
      const angleVal = Math.atan2(dy, dx);

      // Composition accumulators
      let sumX = 0;
      let sumY = 0;
      let prodScale = 1;
      let sumRotate = 0;
      let sumRotateX = 0;
      let sumRotateY = 0;
      let hasTransform = false;
      const extraTransforms: string[] = [];
      const opacityFactors: number[] = [];
      const filters: string[] = [];
      let charColor = '';
      let charFontWeight = '';

      for (const inst of instances) {
        const state = inst.charStates[i];
        if (!state) continue;

        if (inst.isPaused) {
          // If paused, lerp state smoothly back to resting values
          state.currX = lerp(state.currX, 0, inst.options.easing);
          state.currY = lerp(state.currY, 0, inst.options.easing);
          state.currScale = lerp(state.currScale, 1, inst.options.easing);
          state.currRotate = lerp(state.currRotate, 0, inst.options.easing);
          state.currRotateX = lerp(state.currRotateX, 0, inst.options.easing);
          state.currRotateY = lerp(state.currRotateY, 0, inst.options.easing);
          state.currOpacity = lerp(state.currOpacity, 1, inst.options.easing);

          if (
            Math.abs(state.currX) > 0.01 ||
            Math.abs(state.currY) > 0.01 ||
            Math.abs(state.currScale - 1) > 0.001 ||
            Math.abs(state.currRotate) > 0.01 ||
            Math.abs(state.currRotateX) > 0.01 ||
            Math.abs(state.currRotateY) > 0.01
          ) {
            hasTransform = true;
            sumX += state.currX;
            sumY += state.currY;
            prodScale *= state.currScale;
            sumRotate += state.currRotate;
            sumRotateX += state.currRotateX;
            sumRotateY += state.currRotateY;
          }

          if (state.hasOpacity && Math.abs(state.currOpacity - 1) > 0.005) {
            opacityFactors.push(state.currOpacity);
          }
          continue;
        }

        // Pointer active check for this specific instance
        let pointerActive = pointer.isActive;
        if (inst.options.pointerArea === 'target') {
          const isInside =
            pointer.x >= containerRect.left &&
            pointer.x <= containerRect.right &&
            pointer.y >= containerRect.top &&
            pointer.y <= containerRect.bottom;
          if (!isInside) {
            pointerActive = false;
          }
        }

        if (pointer.isTouch) {
          if (inst.options.touch === 'none') {
            pointerActive = false;
          } else if (inst.options.touch === 'tap' && !pointer.isActive) {
            pointerActive = false;
          }
        }

        const isReducedMotion = inst.options.respectReducedMotion && prefersReducedMotion();
        const rawProgress = pointerActive ? clamp(1 - dist / inst.options.radius, 0, 1) : 0;
        const progress = isReducedMotion ? 0 : rawProgress;

        let targetStyles: InteractCharStyles | void = undefined;
        if (inst.update) {
          try {
            targetStyles = inst.update({
              char: charEl,
              index: i,
              total: chars.length,
              dx,
              dy,
              distance: dist,
              angle: angleVal,
              progress,
              options: inst.options,
            });
          } catch (err) {
            console.error('[words-in-motion] interact update error:', err);
          }
        }

        if (targetStyles) {
          let targetX = (targetStyles.translateX ?? 0) * (isReducedMotion ? 0 : 1);
          let targetY = (targetStyles.translateY ?? 0) * (isReducedMotion ? 0 : 1);
          let targetScale = isReducedMotion ? 1 : (targetStyles.scale ?? 1);
          let targetRotate = (targetStyles.rotate ?? 0) * (isReducedMotion ? 0 : 1);
          let targetRotateX = (targetStyles.rotateX ?? 0) * (isReducedMotion ? 0 : 1);
          let targetRotateY = (targetStyles.rotateY ?? 0) * (isReducedMotion ? 0 : 1);

          state.extraTransform = '';
          if (targetStyles.transform) {
            const rotXMatch = targetStyles.transform.match(/rotateX\(([-\d.]+)deg\)/);
            if (rotXMatch && targetStyles.rotateX === undefined) {
              targetRotateX = parseFloat(rotXMatch[1]) * (isReducedMotion ? 0 : 1);
            }
            const rotYMatch = targetStyles.transform.match(/rotateY\(([-\d.]+)deg\)/);
            if (rotYMatch && targetStyles.rotateY === undefined) {
              targetRotateY = parseFloat(rotYMatch[1]) * (isReducedMotion ? 0 : 1);
            }
            const rotMatch = targetStyles.transform.match(/rotate\(([-\d.]+)deg\)/);
            if (rotMatch && targetStyles.rotate === undefined) {
              targetRotate = parseFloat(rotMatch[1]) * (isReducedMotion ? 0 : 1);
            }
            const scaleMatch = targetStyles.transform.match(/scale\(([-\d.]+)\)/);
            if (scaleMatch && targetStyles.scale === undefined) {
              targetScale = isReducedMotion ? 1 : parseFloat(scaleMatch[1]);
            }

            const cleaned = targetStyles.transform
              .replace(/rotate[XY]?\([-\d.]+deg\)/g, '')
              .replace(/scale\([-\d.]+\)/g, '')
              .replace(/translate3d\([^)]+\)/g, '')
              .trim();
            if (cleaned) {
              state.extraTransform = cleaned;
            }
          }

          const targetOpacity = targetStyles.opacity ?? 1;
          state.hasOpacity = targetStyles.opacity !== undefined;

          state.currX = lerp(state.currX, targetX, inst.options.easing);
          state.currY = lerp(state.currY, targetY, inst.options.easing);
          state.currScale = lerp(state.currScale, targetScale, inst.options.easing);
          state.currRotate = lerp(state.currRotate, targetRotate, inst.options.easing);
          state.currRotateX = lerp(state.currRotateX, targetRotateX, inst.options.easing);
          state.currRotateY = lerp(state.currRotateY, targetRotateY, inst.options.easing);
          state.currOpacity = lerp(state.currOpacity, targetOpacity, inst.options.easing);

          state.hasTransform = Boolean(
            targetStyles.translateX !== undefined ||
            targetStyles.translateY !== undefined ||
            targetStyles.scale !== undefined ||
            targetStyles.rotate !== undefined ||
            targetStyles.rotateX !== undefined ||
            targetStyles.rotateY !== undefined ||
            targetStyles.transform ||
            Math.abs(state.currX) > 0.01 ||
            Math.abs(state.currY) > 0.01 ||
            Math.abs(state.currScale - 1) > 0.001 ||
            Math.abs(state.currRotate) > 0.01 ||
            Math.abs(state.currRotateX) > 0.01 ||
            Math.abs(state.currRotateY) > 0.01
          );

          state.filter = targetStyles.filter || '';
          state.color = targetStyles.color || '';
          state.fontWeight = targetStyles.fontWeight !== undefined ? String(targetStyles.fontWeight) : '';
        } else {
          state.currX = lerp(state.currX, 0, inst.options.easing);
          state.currY = lerp(state.currY, 0, inst.options.easing);
          state.currScale = lerp(state.currScale, 1, inst.options.easing);
          state.currRotate = lerp(state.currRotate, 0, inst.options.easing);
          state.currRotateX = lerp(state.currRotateX, 0, inst.options.easing);
          state.currRotateY = lerp(state.currRotateY, 0, inst.options.easing);
          state.currOpacity = lerp(state.currOpacity, 1, inst.options.easing);
          state.hasTransform = Math.abs(state.currX) > 0.01 || Math.abs(state.currY) > 0.01;
          state.filter = '';
          state.color = '';
          state.fontWeight = '';
        }

        // Accumulate this instance's contribution for char i
        if (state.hasTransform) {
          hasTransform = true;
          sumX += state.currX;
          sumY += state.currY;
          prodScale *= state.currScale;
          sumRotate += state.currRotate;
          sumRotateX += state.currRotateX;
          sumRotateY += state.currRotateY;
          if (state.extraTransform) {
            extraTransforms.push(state.extraTransform);
          }
        }

        if (state.hasOpacity || Math.abs(state.currOpacity - 1) > 0.005) {
          opacityFactors.push(state.currOpacity);
        }

        if (state.filter) {
          filters.push(state.filter);
        }

        if (state.color) {
          charColor = state.color;
          elementHasCustomColor = true;
        }

        if (state.fontWeight) {
          charFontWeight = state.fontWeight;
          elementHasCustomFontWeight = true;
        }
      } // end instances loop

      // Apply composed transform
      if (hasTransform) {
        const parts: string[] = [];
        if (Math.abs(sumX) > 0.01 || Math.abs(sumY) > 0.01) {
          parts.push(`translate3d(${sumX.toFixed(2)}px, ${sumY.toFixed(2)}px, 0)`);
        }
        if (Math.abs(prodScale - 1) > 0.001) {
          parts.push(`scale(${prodScale.toFixed(3)})`);
        }
        if (Math.abs(sumRotate) > 0.01) {
          parts.push(`rotate(${sumRotate.toFixed(2)}deg)`);
        }
        if (Math.abs(sumRotateX) > 0.01) {
          parts.push(`rotateX(${sumRotateX.toFixed(2)}deg)`);
        }
        if (Math.abs(sumRotateY) > 0.01) {
          parts.push(`rotateY(${sumRotateY.toFixed(2)}deg)`);
        }
        if (extraTransforms.length > 0) {
          parts.push(extraTransforms.join(' '));
        }
        charEl.style.transform = parts.length > 0 ? parts.join(' ') : '';
      } else {
        charEl.style.transform = '';
      }

      // Apply composed opacity (multiplicative combination across all active opacity-influencing effects)
      if (opacityFactors.length > 0) {
        const finalOpacity = clamp(
          opacityFactors.reduce((acc, val) => acc * val, 1),
          0,
          1
        );
        charEl.style.opacity = finalOpacity.toFixed(3);
      } else {
        charEl.style.opacity = '';
      }

      // Apply composed filter
      if (filters.length > 0) {
        charEl.style.filter = filters.join(' ');
      } else {
        charEl.style.filter = '';
      }

      // Apply color and font weight
      if (charColor) {
        charEl.style.color = charColor;
      } else if (ctx.hasCustomColor) {
        charEl.style.color = '';
      }

      if (charFontWeight) {
        charEl.style.fontWeight = charFontWeight;
      } else if (ctx.hasCustomFontWeight) {
        charEl.style.fontWeight = '';
      }
    } // end chars loop

    ctx.hasCustomColor = elementHasCustomColor;
    ctx.hasCustomFontWeight = elementHasCustomFontWeight;
  };
}

function destroyInstance(instance: InteractionInstance) {
  const ctx = elementContexts.get(instance.element);
  if (!ctx) return;

  ctx.instances.delete(instance);

  if (ctx.instances.size === 0) {
    // Last instance on this element -> complete cleanup and DOM reversion
    ctx.unobserveVisibility();
    ctx.measurer.destroy();
    ctx.revert();
    elementContexts.delete(instance.element);
    checkPointerTeardown();
  } else {
    // Other instances remain active on this element -> re-render composed styles without this instance
    ctx.renderComposed(getPointerState());
  }
}

function createSingleInteraction(
  element: HTMLElement,
  options?: BaseInteractOptions,
  update?: InteractUpdateCallback
): InteractHandle {
  const opts: Required<BaseInteractOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Find or create ElementContext for this DOM element
  let ctx = elementContexts.get(element);
  if (!ctx) {
    const { chars, revert } = splitChars(element);
    if (chars.length === 0) {
      return createDummyInteractHandle();
    }

    const measurer = createCharMeasurer(element, chars);
    let isVisible = true;
    const unobserveVisibility = observeVisibility(element, (visible) => {
      isVisible = visible;
    });

    ctx = {
      element,
      chars,
      revert,
      measurer,
      unobserveVisibility,
      get isVisible() {
        return isVisible;
      },
      instances: new Set(),
      hasCustomColor: false,
      hasCustomFontWeight: false,
      renderComposed: () => {},
    };

    ctx.renderComposed = createComposedRenderer(ctx);
    elementContexts.set(element, ctx);
  }

  const instanceId = ++instanceIdCounter;
  const charStates: InstanceCharState[] = ctx.chars.map(() => ({
    currX: 0,
    currY: 0,
    currScale: 1,
    currRotate: 0,
    currRotateX: 0,
    currRotateY: 0,
    currOpacity: 1,
    hasTransform: false,
    extraTransform: '',
    hasOpacity: false,
    filter: '',
    color: '',
    fontWeight: '',
  }));

  const instance: InteractionInstance = {
    id: instanceId,
    element,
    options: opts,
    update,
    charStates,
    isPaused: false,
  };

  ctx.instances.add(instance);
  ensurePointerSubscribed();

  const destroy = () => {
    destroyInstance(instance);
  };

  return {
    destroy,
    cancel: destroy,
    pause: () => {
      instance.isPaused = true;
    },
    resume: () => {
      instance.isPaused = false;
    },
  };
}

/**
 * Foundation factory for creating cursor-reactive typographic interactions.
 * Supports multiple concurrent interaction instances across different elements or the same element,
 * with deterministic transform composition, opacity multiplication, and shared pointer tracking.
 */
export function createInteraction(
  target: Target,
  options?: BaseInteractOptions,
  update?: InteractUpdateCallback
): InteractHandle {
  const elements = resolveElements(target);
  if (elements.length === 0) {
    return createDummyInteractHandle();
  }

  if (elements.length === 1) {
    return createSingleInteraction(elements[0], options, update);
  }

  const handles = elements.map((el) => createSingleInteraction(el, options, update));
  const destroy = () => handles.forEach((h) => h.destroy());
  return {
    destroy,
    cancel: destroy,
    pause: () => handles.forEach((h) => h.pause()),
    resume: () => handles.forEach((h) => h.resume()),
  };
}

/**
 * Debug helper to inspect interact manager state during tests.
 */
export function _getInteractDebug() {
  return {
    elementCount: elementContexts.size,
    totalInstances: Array.from(elementContexts.values()).reduce((sum, c) => sum + c.instances.size, 0),
    isPointerSubscribed: unsubscribePointer !== null,
  };
}
