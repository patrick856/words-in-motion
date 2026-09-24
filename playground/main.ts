import { registry } from './registry';
import './style.css';

const SHORT_SAMPLE_TEXT = 'Words in Motion';
const MULTILINE_SAMPLE_TEXT =
  'Typographic motion for the web. Interactive cursor-reactive text effects that respond seamlessly as you move across the screen.';

function renderCategorySection(
  containerId: string,
  title: string,
  categoryKey: 'intro' | 'loop' | 'outro' | 'interact'
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
      categoryKey === 'interact' ? 'No interact effects added yet.' : `No ${categoryKey} animations added yet.`;
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

    const stage = document.createElement('div');
    stage.className = categoryKey === 'interact' ? 'stage multiline-stage' : 'stage';
    const initialText = categoryKey === 'interact' ? MULTILINE_SAMPLE_TEXT : SHORT_SAMPLE_TEXT;
    stage.textContent = initialText;

    let activeHandle: { cancel?: () => void; destroy?: () => void } | void;

    if (categoryKey === 'interact') {
      const toggleBtn = document.createElement('button');
      let isDestroyed = false;

      const runEffect = () => {
        stage.textContent = initialText;
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

      const runAnimation = () => {
        if (activeHandle && typeof activeHandle.cancel === 'function') {
          activeHandle.cancel();
        }
        stage.textContent = initialText;
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlayground);
} else {
  initPlayground();
}
