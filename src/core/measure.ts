export interface CharMeasure {
  element: HTMLElement;
  /** Center X position in pixels relative to the parent container's top-left corner. */
  x: number;
  /** Center Y position in pixels relative to the parent container's top-left corner. */
  y: number;
  /** Resting border-box dimensions used for letter contact. */
  width: number;
  height: number;
}

export interface MeasurerHandle {
  getMeasures: () => CharMeasure[];
  remeasure: () => void;
  destroy: () => void;
}

/**
 * Measures each character element's center point relative to the container element.
 */
export function measureCharCenters(container: HTMLElement, chars: HTMLElement[]): CharMeasure[] {
  if (typeof window === 'undefined' || typeof container.getBoundingClientRect !== 'function') {
    return chars.map((charEl) => ({ element: charEl, x: 0, y: 0, width: 0, height: 0 }));
  }

  const containerRect = container.getBoundingClientRect();
  const measures: CharMeasure[] = [];

  for (let i = 0; i < chars.length; i++) {
    const charEl = chars[i];
    const rect = charEl.getBoundingClientRect();
    measures.push({
      element: charEl,
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top,
      width: rect.width,
      height: rect.height,
    });
  }

  return measures;
}

/**
 * Creates a measurer for character center positions that automatically updates on resize or font load.
 */
export function createCharMeasurer(
  container: HTMLElement,
  chars: HTMLElement[],
  onMeasure?: (measures: CharMeasure[]) => void
): MeasurerHandle {
  const measureRest = () => {
    const transforms = chars.map((char) => char.style.transform);
    chars.forEach((char) => {
      char.style.transform = 'none';
    });
    const result = measureCharCenters(container, chars);
    chars.forEach((char, i) => {
      char.style.transform = transforms[i];
    });
    return result;
  };
  let destroyed = false;
  let measures = measureRest();
  if (onMeasure) onMeasure(measures);

  let resizeObserver: ResizeObserver | null = null;
  let lastWidth = container.offsetWidth;
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  const triggerRemeasure = () => {
    if (destroyed) return;
    measures = measureRest();
    if (onMeasure) onMeasure(measures);
  };

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        if (Math.abs(newWidth - lastWidth) > 0.5 || entry.contentRect.height > 0) {
          lastWidth = newWidth;
          if (debounceTimeout !== null) clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(triggerRemeasure, 100);
        }
      }
    });
    resizeObserver.observe(container);
  }

  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => triggerRemeasure()).catch(() => {});
  }
  document.fonts?.addEventListener?.('loadingdone', triggerRemeasure);
  window.addEventListener('resize', triggerRemeasure);

  return {
    getMeasures: () => measures,
    remeasure: triggerRemeasure,
    destroy: () => {
      destroyed = true;
      document.fonts?.removeEventListener?.('loadingdone', triggerRemeasure);
      window.removeEventListener('resize', triggerRemeasure);
      if (resizeObserver) resizeObserver.disconnect();
      if (debounceTimeout !== null) clearTimeout(debounceTimeout);
    },
  };
}
