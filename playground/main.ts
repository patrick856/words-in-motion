import { registry } from './registry';
import './style.css';

const SAMPLE_TEXT = 'Words in Motion';

function renderCategorySection(
  containerId: string,
  title: string,
  categoryKey: 'intro' | 'loop' | 'outro'
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  const entries = registry.filter((e) => e.category === categoryKey);

  const sectionHeading = document.createElement('h2');
  sectionHeading.className = 'section-title';
  sectionHeading.textContent = title;
  container.appendChild(sectionHeading);

  if (entries.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = `No ${categoryKey} animations added yet.`;
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

    const replayBtn = document.createElement('button');
    replayBtn.textContent = 'Replay';

    const stage = document.createElement('div');
    stage.className = 'stage';
    stage.textContent = SAMPLE_TEXT;

    let activeHandle: { cancel?: () => void } | void;

    const runAnimation = () => {
      if (activeHandle && typeof activeHandle.cancel === 'function') {
        activeHandle.cancel();
      }
      stage.textContent = SAMPLE_TEXT;
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

    // Run animation once on render
    runAnimation();
  });

  container.appendChild(grid);
}

function initPlayground() {
  renderCategorySection('intro-section', 'Intro Animations', 'intro');
  renderCategorySection('loop-section', 'Loop Animations', 'loop');
  renderCategorySection('outro-section', 'Outro Animations', 'outro');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlayground);
} else {
  initPlayground();
}
