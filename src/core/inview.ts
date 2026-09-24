export type InViewCallback = (isIntersecting: boolean, entry: IntersectionObserverEntry) => void;

export interface InViewOptions {
  rootMargin?: string;
  threshold?: number | number[];
}

interface ObserverInstance {
  observer: IntersectionObserver;
  targets: Map<HTMLElement, Set<InViewCallback>>;
}

const observers = new Map<string, ObserverInstance>();

function getObserverKey(options?: InViewOptions): string {
  const margin = options?.rootMargin || '0px';
  const thresh = Array.isArray(options?.threshold)
    ? options.threshold.join(',')
    : String(options?.threshold ?? 0);
  return `${margin}|${thresh}`;
}

/**
 * Subscribes an element to a shared IntersectionObserver pool grouped by rootMargin and threshold.
 * Returns an unsubscribe function.
 */
export function subscribeInView(
  element: HTMLElement,
  callback: InViewCallback,
  options?: InViewOptions
): () => void {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    // SSR or fallback: trigger immediately with isIntersecting = true
    callback(true, { isIntersecting: true, target: element } as unknown as IntersectionObserverEntry);
    return () => {};
  }

  const key = getObserverKey(options);
  let instance = observers.get(key);

  if (!instance) {
    const targets = new Map<HTMLElement, Set<InViewCallback>>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const targetEl = entry.target as HTMLElement;
          const callbacks = targets.get(targetEl);
          if (callbacks) {
            for (const cb of callbacks) {
              cb(entry.isIntersecting, entry);
            }
          }
        }
      },
      {
        rootMargin: options?.rootMargin || '0px',
        threshold: options?.threshold ?? 0,
      }
    );

    instance = { observer, targets };
    observers.set(key, instance);
  }

  let cbs = instance.targets.get(element);
  if (!cbs) {
    cbs = new Set<InViewCallback>();
    instance.targets.set(element, cbs);
    instance.observer.observe(element);
  }

  cbs.add(callback);

  return () => {
    if (!instance) return;
    const targetCbs = instance.targets.get(element);
    if (targetCbs) {
      targetCbs.delete(callback);
      if (targetCbs.size === 0) {
        instance.targets.delete(element);
        instance.observer.unobserve(element);
      }
    }

    if (instance.targets.size === 0) {
      instance.observer.disconnect();
      observers.delete(key);
    }
  };
}

/**
 * Debug helper to inspect active IntersectionObserver instances.
 */
export function _getInViewDebug() {
  return {
    observerCount: observers.size,
  };
}
