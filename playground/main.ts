import { registry } from './registry';
import './style.css';

const SHORT_SAMPLE_TEXT = 'Words in Motion';
const PARAGRAPH_SAMPLE_TEXT =
  'Words move differently when a sentence has room to breathe. This paragraph is long enough to wrap across several lines, so you can see how each effect handles spacing, rhythm, and the flow of real reading.';

type PlaygroundHandle = {
  cancel?: () => void;
  destroy?: () => void;
  pause?: () => void;
  resume?: () => void;
};

let paragraphMode = false;
let scrollStart = 'top 80%';
let scrollEnd = 'top 20%';
const activeHandles = new Set<PlaygroundHandle>();

function sampleText(): string {
  return paragraphMode ? PARAGRAPH_SAMPLE_TEXT : SHORT_SAMPLE_TEXT;
}

function setStageText(stage: HTMLElement): void {
  stage.textContent = sampleText();
  stage.classList.toggle('paragraph-stage', paragraphMode);
}

function disposeActiveHandles(): void {
  activeHandles.forEach((handle) => {
    if (typeof handle.destroy === 'function') handle.destroy();
    else if (typeof handle.cancel === 'function') handle.cancel();
  });
  activeHandles.clear();
}

function renderCategorySection(
  containerId: string,
  title: string,
  categoryKey: 'intro' | 'loop' | 'outro' | 'interact' | 'scroll'
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  const entries = registry.filter((e) => e.category === categoryKey);

  const sectionHeading = document.createElement('h2');
  sectionHeading.className = 'section-title';
  sectionHeading.textContent = title;
  container.appendChild(sectionHeading);

  if (categoryKey === 'scroll') {
    const settings = document.createElement('div');
    settings.className = 'scroll-settings';

    const createPositionInput = (labelText: string, value: string) => {
      const label = document.createElement('label');
      label.className = 'scroll-position-field';
      label.textContent = labelText;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.placeholder = 'top 80%';
      label.appendChild(input);
      settings.appendChild(label);
      return input;
    };

    const startInput = createPositionInput('Start', scrollStart);
    const endInput = createPositionInput('End', scrollEnd);
    const applyButton = document.createElement('button');
    applyButton.textContent = 'Apply range';
    applyButton.addEventListener('click', () => {
      scrollStart = startInput.value.trim() || 'top 80%';
      scrollEnd = endInput.value.trim() || 'top 20%';
      initPlayground();
    });
    settings.appendChild(applyButton);

    const hint = document.createElement('span');
    hint.className = 'scroll-settings-hint';
    hint.textContent = 'Example: top 80%, bottom 20%, or 120px';
    settings.appendChild(hint);
    container.appendChild(settings);
  }

  if (categoryKey === 'interact') {
    const note = document.createElement('p');
    note.className = 'section-note';
    note.textContent = 'Touch devices behave differently. Test on a real phone.';
    container.appendChild(note);
  }

  if (entries.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent =
      categoryKey === 'interact'
        ? 'No interact effects added yet.'
        : categoryKey === 'scroll'
          ? 'No scroll animations added yet.'
          : `No ${categoryKey} animations added yet.`;
    container.appendChild(emptyState);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'cards-grid';
  // Effects measure live layout; mount the grid before invoking any animation.
  container.appendChild(grid);

  entries.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'card';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';

    const cardTitle = document.createElement('div');
    cardTitle.className = 'card-title';
    cardTitle.textContent = entry.name;

    const controls = document.createElement('div');
    controls.className = 'card-controls';

    let activeHandle: PlaygroundHandle | void;

    if (categoryKey === 'scroll') {
      const resetBtn = document.createElement('button');
      resetBtn.textContent = 'Reset';

      const scrollContainer = document.createElement('div');
      scrollContainer.className = 'scroll-wrapper';

      const spacerTop = document.createElement('div');
      spacerTop.className = 'scroll-spacer';
      spacerTop.textContent = 'Scroll ↓';

      const stage = document.createElement('div');
      stage.className = 'stage multiline-stage';
      setStageText(stage);

      const spacerBottom = document.createElement('div');
      spacerBottom.className = 'scroll-spacer';
      spacerBottom.textContent = 'End of scroll boundary';

      scrollContainer.appendChild(spacerTop);
      scrollContainer.appendChild(stage);
      scrollContainer.appendChild(spacerBottom);

      const runScrollEffect = () => {
        if (activeHandle && typeof activeHandle.destroy === 'function') {
          activeHandle.destroy();
          activeHandles.delete(activeHandle);
        }
        scrollContainer.scrollTop = 0;
        setStageText(stage);
        activeHandle = entry.run(stage, { start: scrollStart, end: scrollEnd });
        if (activeHandle) activeHandles.add(activeHandle);
      };

      resetBtn.addEventListener('click', runScrollEffect);
      controls.appendChild(resetBtn);

      cardHeader.appendChild(cardTitle);
      cardHeader.appendChild(controls);
      card.appendChild(cardHeader);
      card.appendChild(scrollContainer);

      grid.appendChild(card);
      runScrollEffect();
    } else if (categoryKey === 'interact') {
      const toggleBtn = document.createElement('button');
      let isDestroyed = false;

      const stage = document.createElement('div');
      stage.className = 'stage multiline-stage';
      setStageText(stage);

      const runEffect = () => {
        setStageText(stage);
        activeHandle = entry.run(stage);
        if (activeHandle) activeHandles.add(activeHandle);
        isDestroyed = false;
        toggleBtn.textContent = 'Destroy';
      };

      toggleBtn.addEventListener('click', () => {
        if (!isDestroyed) {
          if (activeHandle && typeof activeHandle.destroy === 'function') {
            activeHandle.destroy();
            activeHandles.delete(activeHandle);
          }
          isDestroyed = true;
          toggleBtn.textContent = 'Recreate';
        } else {
          runEffect();
        }
      });

      controls.appendChild(toggleBtn);
      cardHeader.appendChild(cardTitle);
      cardHeader.appendChild(controls);
      card.appendChild(cardHeader);
      card.appendChild(stage);

      grid.appendChild(card);
      runEffect();
    } else {
      const replayBtn = document.createElement('button');
      replayBtn.textContent = 'Replay';

      const stage = document.createElement('div');
      stage.className = 'stage';
      setStageText(stage);

      const runAnimation = () => {
        if (activeHandle && typeof activeHandle.cancel === 'function') {
          activeHandle.cancel();
          activeHandles.delete(activeHandle);
        }
        setStageText(stage);
        activeHandle = entry.run(stage);
        if (activeHandle) activeHandles.add(activeHandle);
      };

      replayBtn.addEventListener('click', runAnimation);
      controls.appendChild(replayBtn);

      if (categoryKey === 'loop') {
        const stopBtn = document.createElement('button');
        stopBtn.textContent = 'Stop';
        stopBtn.addEventListener('click', () => {
          if (activeHandle && typeof activeHandle.cancel === 'function') {
            activeHandle.cancel();
            activeHandles.delete(activeHandle);
          }
        });
        controls.appendChild(stopBtn);
      }

      cardHeader.appendChild(cardTitle);
      cardHeader.appendChild(controls);
      card.appendChild(cardHeader);
      card.appendChild(stage);

      grid.appendChild(card);
      runAnimation();
    }
  });
}

function initPlayground() {
  disposeActiveHandles();
  renderCategorySection('intro-section', 'Intro Animations', 'intro');
  renderCategorySection('loop-section', 'Loop Animations', 'loop');
  renderCategorySection('outro-section', 'Outro Animations', 'outro');
  renderCategorySection('interact-section', 'Interact Effects', 'interact');
  renderCategorySection('scroll-section', 'Scroll Animations', 'scroll');
}

function initSampleModeControls() {
  const shortButton = document.getElementById('short-mode');
  const paragraphButton = document.getElementById('paragraph-mode');
  if (!shortButton || !paragraphButton) return;

  const updateMode = (useParagraph: boolean) => {
    paragraphMode = useParagraph;
    shortButton.setAttribute('aria-pressed', String(!useParagraph));
    paragraphButton.setAttribute('aria-pressed', String(useParagraph));
    initPlayground();
  };

  shortButton.addEventListener('click', () => updateMode(false));
  paragraphButton.addEventListener('click', () => updateMode(true));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initSampleModeControls();
    initPlayground();
  });
} else {
  initSampleModeControls();
  initPlayground();
}
