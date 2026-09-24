export interface AnimationEntry {
  name: string;
  category: 'intro' | 'loop' | 'outro' | 'interact';
  run: (
    el: HTMLElement
  ) => { finished?: Promise<void>; cancel?: () => void; destroy?: () => void; pause?: () => void; resume?: () => void } | void;
}

/**
 * Registry of available animations for the playground demo gallery.
 * Add new entries here as animations are implemented.
 */
export const registry: AnimationEntry[] = [];
