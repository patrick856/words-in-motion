import { registry } from './registry';
import './style.css';

const SHORT_SAMPLE_TEXT = 'Words in Motion';
const MULTILINE_SAMPLE_TEXT =
  'Typographic motion for the web. Interactive cursor-reactive text effects that respond seamlessly as you move across the screen.';
const SCROLL_SAMPLE_TEXT =
  'Scroll-driven typographic motion for the web.\nText progress accelerates as you scroll through the viewport.\nSmooth scrub or triggered viewport animations.';

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

    let activeHandle: {
      cancel?: () => void;
      destroy?: () => void;
      pause?: () => void;
      resume?: () => void;
    } | void;

    if (categoryKey === 'scroll') {
      const resetBtn = document.createElement('button');
      resetBtn.textContent = 'Reset';

      const scrollContainer = document.createElement('div');
      scrollContainer.className = 'scroll-wrapper';

      const spacerTop = document.createElement('div');
      spacerTop.className = 'scroll-spacer';
      spacerTop.textContent = 'Scroll down ↓';

      const stage = document.createElement('div');
      stage.className = 'stage multiline-stage';
      stage.textContent = SCROLL_SAMPLE_TEXT;

      const spacerBottom = document.createElement('div');
      spacerBottom.className = 'scroll-spacer';
      spacerBottom.textContent = 'End of scroll boundary';

      scrollContainer.appendChild(spacerTop);
      scrollContainer.appendChild(stage);
      scrollContainer.appendChild(spacerBottom);

      const runScrollEffect = () => {
        if (activeHandle && typeof activeHandle.destroy === 'function') {
          activeHandle.destroy();
        }
        scrollContainer.scrollTop = 0;
        stage.textContent = SCROLL_SAMPLE_TEXT;
        activeHandle = entry.run(stage);
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
      stage.textContent = MULTILINE_SAMPLE_TEXT;

      const runEffect = () => {
        stage.textContent = MULTILINE_SAMPLE_TEXT;
        activeHandle = entry.run(stage);
        isDestroyed = false;
        toggleBtn.textContent = 'Destroy';
      };

      toggleBtn.addEventListener('click', () => {
        if (!isDestroyed) {
          if (activeHandle && typeof activeHandle.destroy === 'function') {
            activeHandle.destroy();
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
      stage.textContent = SHORT_SAMPLE_TEXT;

      const runAnimation = () => {
        if (activeHandle && typeof activeHandle.cancel === 'function') {
          activeHandle.cancel();
        }
        stage.textContent = SHORT_SAMPLE_TEXT;
        activeHandle = entry.run(stage);
      };

      replayBtn.addEventListener('click', runAnimation);
      controls.appendChild(replayBtn);

      if (categoryKey === 'loop') {
        const stopBtn = document.createElement('button');
        stopBtn.textContent = 'Stop';
        stopBtn.addEventListener('click', () => {
          if (activeHandle && typeof activeHandle.cancel === 'function') {
            activeHandle.cancel();
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

  container.appendChild(grid);
}

function initPlayground() {
  renderCategorySection('intro-section', 'Intro Animations', 'intro');
  renderCategorySection('loop-section', 'Loop Animations', 'loop');
  renderCategorySection('outro-section', 'Outro Animations', 'outro');
  renderCategorySection('interact-section', 'Interact Effects', 'interact');
  renderCategorySection('scroll-section', 'Scroll Animations', 'scroll');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlayground);
} else {
  initPlayground();
}
