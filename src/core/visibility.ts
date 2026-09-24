/**
 * Observes element visibility on screen via IntersectionObserver.
 * Triggers onChange callback with boolean visibility state.
 */
export function observeVisibility(
  element: HTMLElement,
  onChange: (isVisible: boolean) => void
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    onChange(true);
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        onChange(entry.isIntersecting);
      }
    },
    { threshold: 0 }
  );

  observer.observe(element);

  return () => {
    observer.disconnect();
  };
}
