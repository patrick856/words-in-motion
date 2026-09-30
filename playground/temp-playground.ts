import type { Target } from '../src/core/types';

import { directionalReveal } from '../src/intro/directionalReveal';
import { lampFlicker } from '../src/intro/lampFlicker';
import { rise } from '../src/intro/rise';
import { chunkedScramble } from '../src/intro/chunkedScramble';
import { stripRealign } from '../src/intro/stripRealign';

import { blackHole } from '../src/outro/blackHole';
import { paperCut } from '../src/outro/paperCut';
import { hingeDrop, blurAway, windScatter } from '../src/outro';
import { breakAndFade } from '../src/outro/breakAndFade';

import { waveRelay } from '../src/scroll/waveRelay';
import { readingLine } from '../src/scroll/readingLine';
import { scatterReassemble } from '../src/scroll/scatterReassemble';

import { pull } from '../src/interact/pull';
import { push } from '../src/interact/push';
import { proximityFade } from '../src/interact/proximityFade';
import { proximityFlip } from '../src/interact/proximityFlip';
import { proximityRotate } from '../src/interact/proximityRotate';
import { proximityShake } from '../src/interact/proximityShake';
import { obstaclePush } from '../src/interact/obstaclePush';
import { fontWeight } from '../src/interact/fontWeight';
import { accentColor } from '../src/interact/accentColor';

interface EffectDef {
  name: string;
  category: 'intro' | 'outro' | 'scroll' | 'interact';
  run: (
    target: Target,
    opts: Record<string, unknown>
  ) => { cancel?: () => void; destroy?: () => void } | void;
  defaultText: string;
}

const effects: Record<string, EffectDef> = {
  directionalReveal: {
    name: 'directionalReveal',
    category: 'intro',
    defaultText: 'Words that refuse to sit still.  ',
    run: (target, opts) => directionalReveal(target, opts),
  },
  lampFlicker: {
    name: 'lampFlicker',
    category: 'intro',
    defaultText: 'Lamp Flicker In Animation',
    run: (target, opts) => lampFlicker(target, opts),
  },
  rise: {
    name: 'rise',
    category: 'intro',
    defaultText: 'Rise From Baseline Animation',
    run: (target, opts) => rise(target, opts),
  },
  chunkedScramble: {
    name: 'chunkedScramble',
    category: 'intro',
    defaultText: 'Words move in strange ways across the screen',
    run: (target, opts) => chunkedScramble(target, opts),
  },
  stripRealign: {
    name: 'stripRealign',
    category: 'intro',
    defaultText: 'Strip Realign Kinetic Motion',
    run: (target, opts) => stripRealign(target, opts),
  },
  blackHole: {
    name: 'blackHole',
    category: 'outro',
    defaultText: 'Black Hole Collapse Outro',
    run: (target, opts) => blackHole(target, opts),
  },
  paperCut: {
    name: 'paperCut',
    category: 'outro',
    defaultText: 'Paper Cut Sliced Outro Effect',
    run: (target, opts) => paperCut(target, opts),
  },
  hingeDrop: {
    name: 'hingeDrop',
    category: 'outro',
    defaultText: 'Letters Hinge And Fall',
    run: (target, opts) => hingeDrop(target, opts),
  },
  blurAway: {
    name: 'blurAway',
    category: 'outro',
    defaultText: 'Words Dissolve Into Air',
    run: (target, opts) => blurAway(target, opts),
  },
  windScatter: {
    name: 'windScatter',
    category: 'outro',
    defaultText: 'Carried Away By The Wind',
    run: (target, opts) => windScatter(target, opts),
  },
  breakAndFade: {
    name: 'breakAndFade',
    category: 'outro',
    defaultText: 'Break And Fade Samurai Slash Outro',
    run: (target, opts) => breakAndFade(target, opts),
  },
  waveRelay: {
    name: 'waveRelay',
    category: 'scroll',
    defaultText:
      'Wave relay scroll motion.\nTraveling letter displacing characters along its path.\nMulti-line scroll progress.',
    run: (target, opts) => waveRelay(target, opts),
  },
  readingLine: {
    name: 'readingLine',
    category: 'scroll',
    defaultText:
      'Reading line opacity follow.\nWords ramp from base opacity to full opacity on scroll.\nSmooth reading flow.',
    run: (target, opts) => readingLine(target, opts),
  },
  scatterReassemble: {
    name: 'scatterReassemble',
    category: 'scroll',
    defaultText:
      'Scattered letters reassemble on scroll.\nBounded random offsets assembling into sentence.\nScroll progress driven.',
    run: (target, opts) => scatterReassemble(target, opts),
  },
  pull: {
    name: 'pull',
    category: 'interact',
    defaultText:
      'Gravitational pull cursor interaction.\nMove your mouse cursor across this text block.',
    run: (target, opts) => pull(target, opts),
  },
  push: {
    name: 'push',
    category: 'interact',
    defaultText:
      'Anti-gravitational push cursor interaction.\nMove your cursor near these characters.',
    run: (target, opts) => push(target, opts),
  },
  proximityFade: {
    name: 'proximityFade',
    category: 'interact',
    defaultText: 'Proximity fade effect.\nCharacters fade out as cursor approaches.',
    run: (target, opts) => proximityFade(target, opts),
  },
  proximityFlip: {
    name: 'proximityFlip',
    category: 'interact',
    defaultText: 'Proximity 3D flip rotation effect.\nCharacters rotate along 3D Y axis on hover.',
    run: (target, opts) => proximityFlip(target, opts),
  },
  proximityRotate: {
    name: 'proximityRotate',
    category: 'interact',
    defaultText:
      'Proximity 2D rotate upside-down spin.\nCharacters spin clockwise when approached.',
    run: (target, opts) => proximityRotate(target, opts),
  },
  proximityShake: {
    name: 'proximityShake',
    category: 'interact',
    defaultText:
      'Proximity high-frequency shake oscillation.\nIntensity increases with cursor proximity.',
    run: (target, opts) => proximityShake(target, opts),
  },
  obstaclePush: {
    name: 'obstaclePush',
    category: 'interact',
    defaultText:
      'Cursor obstacle physical push effect.\nCharacters push aside along collision vector and spring back.',
    run: (target, opts) => obstaclePush(target, opts),
  },
  fontWeight: {
    name: 'fontWeight',
    category: 'interact',
    defaultText: 'Proximity font weight ramp.\nSmooth weight shift from 300 to 900.',
    run: (target, opts) => fontWeight(target, opts),
  },
  accentColor: {
    name: 'accentColor',
    category: 'interact',
    defaultText: 'Proximity accent color fill highlight.\nSmooth numerical RGB transition.',
    run: (target, opts) => accentColor(target, opts),
  },
  multiEffectSimultaneous: {
    name: 'Multi-Effect Concurrent (Pull + Push + ProximityFade)',
    category: 'interact',
    defaultText: 'Concurrent independent cursor effects across 3 cards',
    run: (_target, opts) => {
      const cards = document.querySelectorAll<HTMLElement>('.direct-multi-card');
      if (cards.length >= 3) {
        const h1 = pull(cards[0], { ...opts, strength: 16 });
        const h2 = push(cards[1], { ...opts, strength: 16 });
        const h3 = proximityFade(cards[2], { ...opts, minOpacity: 0.15 });
        return {
          destroy: () => {
            h1.destroy();
            h2.destroy();
            h3.destroy();
          },
          cancel: () => {
            h1.destroy();
            h2.destroy();
            h3.destroy();
          },
          pause: () => {
            h1.pause();
            h2.pause();
            h3.pause();
          },
          resume: () => {
            h1.resume();
            h2.resume();
            h3.resume();
          },
        };
      }
    },
  },
  sameElementCombo: {
    name: 'Same-Element Composed (Pull + ProximityFade + Rotate)',
    category: 'interact',
    defaultText: 'Same element running Pull + ProximityFade + Rotate simultaneously',
    run: (target, opts) => {
      const h1 = pull(target, { ...opts, radius: 220, strength: 16 });
      const h2 = proximityFade(target, { ...opts, radius: 240, minOpacity: 0.2 });
      const h3 = proximityRotate(target, { ...opts, radius: 200, maxAngle: 45 });
      return {
        destroy: () => {
          h1.destroy();
          h2.destroy();
          h3.destroy();
        },
        cancel: () => {
          h1.destroy();
          h2.destroy();
          h3.destroy();
        },
        pause: () => {
          h1.pause();
          h2.pause();
          h3.pause();
        },
        resume: () => {
          h1.resume();
          h2.resume();
          h3.resume();
        },
      };
    },
  },
};

let activeHandle: { cancel?: () => void; destroy?: () => void } | null | void = null;
let currentEffectKey = 'directionalReveal';

function stopActiveEffect() {
  if (activeHandle) {
    if (typeof activeHandle.cancel === 'function') {
      activeHandle.cancel();
    }
    if (typeof activeHandle.destroy === 'function') {
      activeHandle.destroy();
    }
    activeHandle = null;
  }
}

function renderControlsForEffect(effectKey: string) {
  const container = document.getElementById('dynamic-controls');
  if (!container) return;

  container.innerHTML = '';

  const createInputGroup = (
    labelText: string,
    id: string,
    type: 'number' | 'text' | 'range',
    defaultValue: string | number,
    extraAttrs: Record<string, string> = {}
  ) => {
    const group = document.createElement('div');
    group.className = 'form-group';
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.value = String(defaultValue);
    Object.entries(extraAttrs).forEach(([k, v]) => input.setAttribute(k, v));
    input.addEventListener('input', () => runCurrentEffect());
    group.appendChild(label);
    group.appendChild(input);
    return { group, label, input };
  };

  const createSelectGroup = (
    labelText: string,
    id: string,
    options: { value: string; label: string }[],
    defaultValue: string
  ) => {
    const group = document.createElement('div');
    group.className = 'form-group';
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    const select = document.createElement('select');
    select.id = id;
    options.forEach((opt) => {
      const el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      if (opt.value === defaultValue) el.selected = true;
      select.appendChild(el);
    });
    select.addEventListener('change', () => runCurrentEffect());
    group.appendChild(label);
    group.appendChild(select);
    return { group, label, select };
  };

  const appendTriggerControls = (defaultStart = 'top 80%') => {
    const triggerGroup = createSelectGroup(
      'Trigger Mode',
      'opt-trigger',
      [
        { value: 'immediate', label: 'immediate (default)' },
        { value: 'enter', label: 'enter (on scroll in)' },
        { value: 'leave', label: 'leave (on scroll out)' },
      ],
      'immediate'
    );
    container.appendChild(triggerGroup.group);

    const startGroup = createInputGroup('Scroll Start Anchor', 'opt-start', 'text', defaultStart);
    container.appendChild(startGroup.group);

    const onceGroup = createSelectGroup(
      'Once',
      'opt-once',
      [
        { value: 'true', label: 'true (play once)' },
        { value: 'false', label: 'false (re-trigger)' },
      ],
      'true'
    );
    container.appendChild(onceGroup.group);

    const updateTriggerFields = () => {
      const isImmediate = triggerGroup.select.value === 'immediate';
      startGroup.input.disabled = isImmediate;
      startGroup.group.style.opacity = isImmediate ? '0.35' : '1';
      startGroup.group.style.pointerEvents = isImmediate ? 'none' : 'auto';

      onceGroup.select.disabled = isImmediate;
      onceGroup.group.style.opacity = isImmediate ? '0.35' : '1';
      onceGroup.group.style.pointerEvents = isImmediate ? 'none' : 'auto';

      if (triggerGroup.select.value === 'leave' && startGroup.input.value === 'top 80%') {
        startGroup.input.value = 'bottom 20%';
      } else if (triggerGroup.select.value === 'enter' && startGroup.input.value === 'bottom 20%') {
        startGroup.input.value = 'top 80%';
      }
    };

    triggerGroup.select.addEventListener('change', updateTriggerFields);
    updateTriggerFields();
  };

  const appendScrubControls = (defaultStart = 'top 80%', defaultEnd = 'top 20%') => {
    container.appendChild(
      createInputGroup('Scroll Start Anchor', 'opt-start', 'text', defaultStart).group
    );
    container.appendChild(
      createInputGroup('Scroll End Anchor', 'opt-end', 'text', defaultEnd).group
    );
  };

  const appendInteractControls = () => {
    container.appendChild(
      createSelectGroup(
        'Pointer Area',
        'opt-pointer-area',
        [
          { value: 'viewport', label: 'viewport (global tracking)' },
          { value: 'target', label: 'target (inside bounding box)' },
        ],
        'viewport'
      ).group
    );
    container.appendChild(
      createInputGroup('Radius (px)', 'opt-radius', 'number', 150, {
        min: '20',
        max: '500',
        step: '10',
      }).group
    );
    container.appendChild(
      createInputGroup('Strength', 'opt-strength', 'number', 1, {
        min: '0.1',
        max: '5',
        step: '0.1',
      }).group
    );
  };

  const eff = effects[effectKey];
  const cat = eff?.category;

  if (cat === 'interact') {
    appendInteractControls();
    if (effectKey === 'accentColor') {
      container.appendChild(
        createInputGroup('Accent Color', 'opt-accent', 'text', '#e11d48').group
      );
    }
    return;
  }

  if (cat === 'scroll') {
    appendScrubControls();
    if (effectKey === 'waveRelay') {
      container.appendChild(
        createInputGroup('Push Strength (px)', 'opt-push-strength', 'number', 14, {
          min: '0',
          max: '50',
          step: '1',
        }).group
      );
      container.appendChild(
        createInputGroup('Wave Height (px)', 'opt-wave-height', 'number', 8, {
          min: '0',
          max: '40',
          step: '1',
        }).group
      );
      container.appendChild(
        createInputGroup('Wave Radius (px)', 'opt-wave-radius', 'number', 45, {
          min: '10',
          max: '150',
          step: '5',
        }).group
      );
    }
    return;
  }

  if (effectKey === 'chunkedScramble') {
    container.appendChild(
      createInputGroup('Duration (ms)', 'opt-duration', 'number', 1800, {
        min: '300',
        max: '6000',
        step: '100',
      }).group
    );
    appendTriggerControls();

    const revealByGroup = createSelectGroup(
      'Reveal By',
      'opt-reveal-by',
      [
        { value: 'lines', label: 'Lines' },
        { value: 'chunks', label: 'Chunks' },
      ],
      'lines'
    );
    container.appendChild(revealByGroup.group);

    const chunkSizeGroup = createInputGroup('Chunk Size (words)', 'opt-chunk-size', 'number', 2, {
      min: '1',
      max: '10',
    });
    container.appendChild(chunkSizeGroup.group);

    const updateChunkSizeVisibility = () => {
      const isLines = revealByGroup.select.value === 'lines';
      chunkSizeGroup.input.disabled = isLines;
      chunkSizeGroup.group.style.opacity = isLines ? '0.4' : '1';
      chunkSizeGroup.group.style.pointerEvents = isLines ? 'none' : 'auto';
    };
    revealByGroup.select.addEventListener('change', updateChunkSizeVisibility);
    updateChunkSizeVisibility();

    container.appendChild(
      createInputGroup('Corruption Rate', 'opt-corruption-rate', 'number', 0.3, {
        min: '0.05',
        max: '1',
        step: '0.05',
      }).group
    );
    container.appendChild(
      createInputGroup('Corrupt After Chunks', 'opt-corrupt-after', 'number', 1, {
        min: '0',
        max: '10',
      }).group
    );
    container.appendChild(
      createInputGroup('Heal After Chunks', 'opt-heal-after', 'number', 2, { min: '1', max: '10' })
        .group
    );

    container.appendChild(
      createSelectGroup(
        'Corrupt Mode',
        'opt-corrupt-mode',
        [
          { value: 'mixed', label: 'mixed' },
          { value: 'from-behind', label: 'from-behind' },
          { value: 'instant', label: 'instant' },
        ],
        'mixed'
      ).group
    );

    container.appendChild(
      createSelectGroup(
        'Heal Mode',
        'opt-heal-mode',
        [
          { value: 'mixed', label: 'mixed' },
          { value: 'from-behind', label: 'from-behind' },
          { value: 'instant', label: 'instant' },
        ],
        'mixed'
      ).group
    );

    container.appendChild(
      createSelectGroup(
        'Side (from-behind)',
        'opt-side',
        [
          { value: 'random', label: 'random' },
          { value: 'left', label: 'left' },
          { value: 'right', label: 'right' },
        ],
        'random'
      ).group
    );

    container.appendChild(
      createInputGroup('Behind Ratio (mixed mode)', 'opt-behind-ratio', 'number', 0.5, {
        min: '0',
        max: '1',
        step: '0.1',
      }).group
    );
    return;
  }

  if (effectKey === 'directionalReveal') {
    container.appendChild(
      createInputGroup('Duration (ms)', 'opt-duration', 'number', 900, {
        min: '100',
        max: '3000',
        step: '50',
      }).group
    );
    appendTriggerControls();
    container.appendChild(
      createInputGroup('Stagger (ms)', 'opt-stagger', 'number', 40, {
        min: '5',
        max: '200',
        step: '5',
      }).group
    );
    container.appendChild(
      createSelectGroup(
        'Direction',
        'opt-direction',
        [
          { value: 'left-to-right', label: 'left-to-right' },
          { value: 'right-to-left', label: 'right-to-left' },
          { value: 'center-out', label: 'center-out' },
          { value: 'edges-in', label: 'edges-in' },
        ],
        'left-to-right'
      ).group
    );
    container.appendChild(
      createSelectGroup(
        'Drop In',
        'opt-drop-in',
        [
          { value: 'false', label: 'false' },
          { value: 'true', label: 'true' },
        ],
        'false'
      ).group
    );
    container.appendChild(
      createSelectGroup(
        'Drop Style',
        'opt-drop-style',
        [
          { value: 'settle-on-next', label: 'settle-on-next' },
          { value: 'simple', label: 'simple' },
        ],
        'settle-on-next'
      ).group
    );
    return;
  }

  if (effectKey === 'lampFlicker') {
    container.appendChild(
      createInputGroup('Duration (ms)', 'opt-duration', 'number', 1200, {
        min: '200',
        max: '3000',
        step: '50',
      }).group
    );
    appendTriggerControls();
    container.appendChild(
      createInputGroup('Flickers', 'opt-flickers', 'number', 4, { min: '1', max: '15', step: '1' })
        .group
    );
    container.appendChild(
      createSelectGroup(
        'By',
        'opt-by',
        [
          { value: 'all', label: 'all' },
          { value: 'words', label: 'words' },
          { value: 'chars', label: 'chars' },
        ],
        'all'
      ).group
    );
    container.appendChild(
      createInputGroup('Stagger (ms)', 'opt-stagger', 'number', 50, {
        min: '5',
        max: '200',
        step: '5',
      }).group
    );
    return;
  }

  if (effectKey === 'rise') {
    container.appendChild(
      createInputGroup('Duration (ms)', 'opt-duration', 'number', 800, {
        min: '100',
        max: '3000',
        step: '50',
      }).group
    );
    appendTriggerControls();
    container.appendChild(
      createSelectGroup(
        'From',
        'opt-from',
        [
          { value: 'ground', label: 'ground' },
          { value: 'ceiling', label: 'ceiling' },
        ],
        'ground'
      ).group
    );
    container.appendChild(
      createSelectGroup(
        'Mask',
        'opt-mask',
        [
          { value: 'true', label: 'true' },
          { value: 'false', label: 'false' },
        ],
        'true'
      ).group
    );
    container.appendChild(
      createInputGroup('Distance (px)', 'opt-distance', 'number', 30, {
        min: '5',
        max: '150',
        step: '5',
      }).group
    );
    container.appendChild(
      createInputGroup('Stagger (ms)', 'opt-stagger', 'number', 30, {
        min: '5',
        max: '200',
        step: '5',
      }).group
    );
    return;
  }

  if (effectKey === 'stripRealign') {
    container.appendChild(
      createInputGroup('Duration (ms)', 'opt-duration', 'number', 1400, {
        min: '200',
        max: '3000',
        step: '50',
      }).group
    );
    appendTriggerControls();
    container.appendChild(
      createInputGroup('Strips', 'opt-strips', 'number', 4, { min: '2', max: '16', step: '1' })
        .group
    );
    container.appendChild(
      createInputGroup('Max Offset (px)', 'opt-max-offset', 'number', 35, {
        min: '5',
        max: '100',
        step: '5',
      }).group
    );
    return;
  }

  // Outro effects
  if (cat === 'outro') {
    container.appendChild(
      createInputGroup('Duration (ms)', 'opt-duration', 'number', 700, {
        min: '100',
        max: '3000',
        step: '50',
      }).group
    );
    appendTriggerControls('bottom 20%');

    if (effectKey === 'blackHole') {
      container.appendChild(
        createSelectGroup(
          'By',
          'opt-by',
          [
            { value: 'chars', label: 'chars' },
            { value: 'words', label: 'words' },
          ],
          'chars'
        ).group
      );
      container.appendChild(
        createInputGroup('Stagger (ms)', 'opt-stagger', 'number', 30, {
          min: '5',
          max: '150',
          step: '5',
        }).group
      );
    } else if (effectKey === 'paperCut') {
      container.appendChild(
        createInputGroup('Strips', 'opt-strips', 'number', 4, { min: '2', max: '16', step: '1' })
          .group
      );
      container.appendChild(
        createInputGroup('Max Offset (px)', 'opt-max-offset', 'number', 35, {
          min: '5',
          max: '100',
          step: '5',
        }).group
      );
    } else if (effectKey === 'breakAndFade') {
      container.appendChild(
        createInputGroup('Sweep Duration (ms)', 'opt-sweep-duration', 'number', 400, {
          min: '100',
          max: '1000',
          step: '50',
        }).group
      );
    }
    return;
  }

  // Default fallback for any remaining effects
  container.appendChild(
    createInputGroup('Duration (ms)', 'opt-duration', 'number', 600, {
      min: '100',
      max: '3000',
      step: '50',
    }).group
  );
  appendTriggerControls();
}

function getOptionsFromInputs(): Record<string, unknown> {
  const opts: Record<string, unknown> = {};

  // Trigger & Scrub scroll options
  const triggerInput = document.getElementById('opt-trigger') as HTMLSelectElement | null;
  if (triggerInput) opts.trigger = triggerInput.value;

  const startInput = document.getElementById('opt-start') as HTMLInputElement | null;
  if (startInput && startInput.value.trim()) opts.start = startInput.value.trim();

  const endInput = document.getElementById('opt-end') as HTMLInputElement | null;
  if (endInput && endInput.value.trim()) opts.end = endInput.value.trim();

  const onceInput = document.getElementById('opt-once') as HTMLSelectElement | null;
  if (onceInput) opts.once = onceInput.value === 'true';

  // Interact options
  const pointerAreaInput = document.getElementById('opt-pointer-area') as HTMLSelectElement | null;
  if (pointerAreaInput) opts.pointerArea = pointerAreaInput.value as 'viewport' | 'target';

  const radiusInput = document.getElementById('opt-radius') as HTMLInputElement | null;
  if (radiusInput) opts.radius = Number(radiusInput.value);

  const strengthInput = document.getElementById('opt-strength') as HTMLInputElement | null;
  if (strengthInput) opts.strength = Number(strengthInput.value);

  const accentInput = document.getElementById('opt-accent') as HTMLInputElement | null;
  if (accentInput) opts.accentColor = accentInput.value;

  // chunkedScramble options
  const revealByInput = document.getElementById('opt-reveal-by') as HTMLSelectElement | null;
  if (revealByInput) opts.revealBy = revealByInput.value as 'lines' | 'chunks';

  const chunkSizeInput = document.getElementById('opt-chunk-size') as HTMLInputElement | null;
  if (chunkSizeInput) opts.chunkSize = Number(chunkSizeInput.value);

  const corruptAfterInput = document.getElementById('opt-corrupt-after') as HTMLInputElement | null;
  if (corruptAfterInput) opts.corruptAfterChunks = Number(corruptAfterInput.value);

  const healAfterInput = document.getElementById('opt-heal-after') as HTMLInputElement | null;
  if (healAfterInput) opts.healAfterChunks = Number(healAfterInput.value);

  const corruptionRateInput = document.getElementById(
    'opt-corruption-rate'
  ) as HTMLInputElement | null;
  if (corruptionRateInput) opts.corruptionRate = Number(corruptionRateInput.value);

  const corruptModeInput = document.getElementById('opt-corrupt-mode') as HTMLSelectElement | null;
  if (corruptModeInput) opts.corruptMode = corruptModeInput.value;

  const healModeInput = document.getElementById('opt-heal-mode') as HTMLSelectElement | null;
  if (healModeInput) opts.healMode = healModeInput.value;

  const sideInput = document.getElementById('opt-side') as HTMLSelectElement | null;
  if (sideInput) opts.side = sideInput.value;

  const behindRatioInput = document.getElementById('opt-behind-ratio') as HTMLInputElement | null;
  if (behindRatioInput) opts.behindRatio = Number(behindRatioInput.value);

  // generic duration/stagger
  const durationInput = document.getElementById('opt-duration') as HTMLInputElement | null;
  if (durationInput) opts.duration = Number(durationInput.value);

  const staggerInput = document.getElementById('opt-stagger') as HTMLInputElement | null;
  if (staggerInput) opts.stagger = Number(staggerInput.value);

  const directionInput = document.getElementById('opt-direction') as HTMLSelectElement | null;
  if (directionInput) opts.direction = directionInput.value;

  const dropInInput = document.getElementById('opt-drop-in') as HTMLSelectElement | null;
  if (dropInInput) opts.dropIn = dropInInput.value === 'true';

  const dropStyleInput = document.getElementById('opt-drop-style') as HTMLSelectElement | null;
  if (dropStyleInput) opts.dropStyle = dropStyleInput.value;

  const flickersInput = document.getElementById('opt-flickers') as HTMLInputElement | null;
  if (flickersInput) opts.flickers = Number(flickersInput.value);

  const byInput = document.getElementById('opt-by') as HTMLSelectElement | null;
  if (byInput) opts.by = byInput.value;

  const fromInput = document.getElementById('opt-from') as HTMLSelectElement | null;
  if (fromInput) opts.from = fromInput.value;

  const maskInput = document.getElementById('opt-mask') as HTMLSelectElement | null;
  if (maskInput) opts.mask = maskInput.value === 'true';

  const distanceInput = document.getElementById('opt-distance') as HTMLInputElement | null;
  if (distanceInput) opts.distance = Number(distanceInput.value);

  const stripsInput = document.getElementById('opt-strips') as HTMLInputElement | null;
  if (stripsInput) opts.strips = Number(stripsInput.value);

  const maxOffsetInput = document.getElementById('opt-max-offset') as HTMLInputElement | null;
  if (maxOffsetInput) opts.maxOffset = Number(maxOffsetInput.value);

  const sweepDurationInput = document.getElementById(
    'opt-sweep-duration'
  ) as HTMLInputElement | null;
  if (sweepDurationInput) opts.sweepDuration = Number(sweepDurationInput.value);

  const pushStrengthInput = document.getElementById('opt-push-strength') as HTMLInputElement | null;
  if (pushStrengthInput) opts.pushStrength = Number(pushStrengthInput.value);

  const waveHeightInput = document.getElementById('opt-wave-height') as HTMLInputElement | null;
  if (waveHeightInput) opts.waveHeight = Number(waveHeightInput.value);

  const waveRadiusInput = document.getElementById('opt-wave-radius') as HTMLInputElement | null;
  if (waveRadiusInput) opts.waveRadius = Number(waveRadiusInput.value);

  return opts;
}

function updateStageWidth() {
  const widthInput = document.getElementById('opt-width') as HTMLInputElement | null;
  const widthValDisplay = document.getElementById('opt-width-val');
  const stage = document.getElementById('stage') as HTMLElement | null;
  const scrollStage = document.getElementById('scroll-stage') as HTMLElement | null;

  if (widthInput) {
    const val = `${widthInput.value}px`;
    if (widthValDisplay) widthValDisplay.textContent = val;
    if (stage) stage.style.maxWidth = val;
    if (scrollStage) scrollStage.style.maxWidth = val;
  }
}

function runCurrentEffect() {
  stopActiveEffect();
  updateStageWidth();

  const effectDef = effects[currentEffectKey];
  if (!effectDef) return;

  const targetMode =
    (document.getElementById('target-mode-select') as HTMLSelectElement)?.value || 'single';
  const stage = document.getElementById('stage') as HTMLElement | null;
  const multiStage = document.getElementById('multi-stage') as HTMLElement | null;
  const scrollWrapper = document.getElementById('scroll-wrapper') as HTMLElement | null;
  const scrollStage = document.getElementById('scroll-stage') as HTMLElement | null;
  const scrollMultiStage = document.getElementById('scroll-multi-stage') as HTMLElement | null;
  const textInput = document.getElementById('custom-text') as HTMLTextAreaElement | null;

  stage?.classList.toggle('directional-case', currentEffectKey === 'directionalReveal');
  scrollStage?.classList.toggle('directional-case', currentEffectKey === 'directionalReveal');

  const options = getOptionsFromInputs();
  const textToUse = textInput?.value || effectDef.defaultText;

  const isScrollDriven =
    effectDef.category === 'scroll' || options.trigger === 'enter' || options.trigger === 'leave';

  if (isScrollDriven) {
    if (stage) stage.style.display = 'none';
    if (multiStage) multiStage.style.display = 'none';
    if (scrollWrapper) {
      scrollWrapper.style.display = 'block';
      scrollWrapper.scrollTop = 0;

      if (targetMode === 'multiple') {
        if (scrollStage) scrollStage.style.display = 'none';
        if (scrollMultiStage) scrollMultiStage.style.display = 'flex';
        const cards = document.querySelectorAll<HTMLElement>('.scroll-multi-card');
        cards.forEach((card, idx) => {
          card.textContent = `${textToUse} [Card ${idx + 1}]`;
        });
        activeHandle = effectDef.run('.scroll-multi-card', options);
      } else {
        if (scrollMultiStage) scrollMultiStage.style.display = 'none';
        if (scrollStage) {
          scrollStage.style.display = 'block';
          scrollStage.textContent = textToUse;
          activeHandle = effectDef.run(scrollStage, options);
        }
      }
    }
  } else {
    const effectiveTargetMode =
      currentEffectKey === 'multiEffectSimultaneous' ? 'multiple' : targetMode;

    if (effectiveTargetMode === 'multiple') {
      if (stage) stage.style.display = 'none';
      if (multiStage) multiStage.style.display = 'flex';
      const cards = document.querySelectorAll<HTMLElement>('.direct-multi-card');
      if (currentEffectKey === 'multiEffectSimultaneous') {
        if (cards[0]) cards[0].textContent = 'Card 1: Gravitational Pull (moves toward cursor)';
        if (cards[1]) cards[1].textContent = 'Card 2: Anti-Gravitational Push (moves away)';
        if (cards[2]) cards[2].textContent = 'Card 3: Proximity Fade (fades near cursor)';
      } else {
        cards.forEach((card, idx) => {
          card.textContent = `${textToUse} [Target ${idx + 1}]`;
        });
      }
      activeHandle = effectDef.run('.direct-multi-card', options);
    } else {
      if (multiStage) multiStage.style.display = 'none';
      if (stage) {
        stage.style.display = 'block';
        stage.textContent = textToUse;
        activeHandle = effectDef.run(stage, options);
      }
    }
  }
}

function populateEffectList(category: string) {
  const effectSelect = document.getElementById('effect-select') as HTMLSelectElement | null;
  if (!effectSelect) return;

  effectSelect.innerHTML = '';
  Object.keys(effects).forEach((key) => {
    const eff = effects[key];
    if (category === 'all' || eff.category === category) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${eff.name} (${eff.category})`;
      effectSelect.appendChild(opt);
    }
  });

  if (effectSelect.options.length > 0) {
    currentEffectKey = effectSelect.options[0].value;
    const textInput = document.getElementById('custom-text') as HTMLTextAreaElement | null;
    if (textInput) textInput.value = effects[currentEffectKey].defaultText;
    renderControlsForEffect(currentEffectKey);
  }
}

function initTempPlayground() {
  const categorySelect = document.getElementById('category-select') as HTMLSelectElement | null;
  const effectSelect = document.getElementById('effect-select') as HTMLSelectElement | null;
  const targetModeSelect = document.getElementById(
    'target-mode-select'
  ) as HTMLSelectElement | null;
  const playBtn = document.getElementById('play-btn');
  const stopBtn = document.getElementById('stop-btn');
  const presetBtn = document.getElementById('preset-text-btn');
  const textInput = document.getElementById('custom-text') as HTMLTextAreaElement | null;
  const widthInput = document.getElementById('opt-width') as HTMLInputElement | null;

  populateEffectList('all');

  categorySelect?.addEventListener('change', (e) => {
    const cat = (e.target as HTMLSelectElement).value;
    populateEffectList(cat);
    runCurrentEffect();
  });

  effectSelect?.addEventListener('change', (e) => {
    currentEffectKey = (e.target as HTMLSelectElement).value;
    if (textInput && effects[currentEffectKey]) {
      textInput.value = effects[currentEffectKey].defaultText;
    }
    renderControlsForEffect(currentEffectKey);
    runCurrentEffect();
  });

  targetModeSelect?.addEventListener('change', () => {
    runCurrentEffect();
  });

  widthInput?.addEventListener('input', () => {
    updateStageWidth();
  });

  playBtn?.addEventListener('click', () => {
    runCurrentEffect();
  });

  stopBtn?.addEventListener('click', () => {
    stopActiveEffect();
  });

  presetBtn?.addEventListener('click', () => {
    if (textInput && effects[currentEffectKey]) {
      textInput.value = effects[currentEffectKey].defaultText;
      runCurrentEffect();
    }
  });

  renderControlsForEffect(currentEffectKey);
  runCurrentEffect();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTempPlayground);
} else {
  initTempPlayground();
}
