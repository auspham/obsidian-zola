async function updateMermaidTheme(newTheme) {
  mermaid.initialize({
    startOnLoad: false,
    theme: newTheme,
    responsive: true,
  });

  const diagrams = document.querySelectorAll('.mermaid');

  for (const diagram of diagrams) {
    const originalCode = diagram.getAttribute('data-original-code');
    diagram.innerHTML = originalCode;
    diagram.removeAttribute('data-processed');
  }

  await mermaid.run({
    nodes: document.querySelectorAll('.mermaid'),
  });

  // Re-apply zoom reset after re-render
  diagrams.forEach((diagram) => {
    const viewport = diagram.closest('.mermaid-zoom-wrapper')?.querySelector('.mermaid-zoom-viewport');
    if (viewport) {
      viewport.style.transform = 'scale(1) translate(0px, 0px)';
      viewport.dataset.scale = '1';
      viewport.dataset.translateX = '0';
      viewport.dataset.translateY = '0';
    }
  });
}

function createZoomWrapper(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'mermaid-zoom-wrapper';

  const toolbar = document.createElement('div');
  toolbar.className = 'mermaid-zoom-toolbar';

  const zoomIn = document.createElement('button');
  zoomIn.className = 'mermaid-zoom-btn';
  zoomIn.setAttribute('aria-label', 'Zoom in');
  zoomIn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>';

  const zoomOut = document.createElement('button');
  zoomOut.className = 'mermaid-zoom-btn';
  zoomOut.setAttribute('aria-label', 'Zoom out');
  zoomOut.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/></svg>';

  const zoomReset = document.createElement('button');
  zoomReset.className = 'mermaid-zoom-btn mermaid-zoom-reset';
  zoomReset.setAttribute('aria-label', 'Reset zoom');
  zoomReset.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 1A5.5 5.5 0 0 0 1 6.5 5.5 5.5 0 0 0 6.5 12a5.48 5.48 0 0 0 3.27-1.08l3.15 3.16a.75.75 0 1 0 1.06-1.06l-3.16-3.15A5.48 5.48 0 0 0 12 6.5 5.5 5.5 0 0 0 6.5 1zM2.5 6.5a4 4 0 1 1 8 0 4 4 0 0 1-8 0z"/></svg>';

  toolbar.appendChild(zoomIn);
  toolbar.appendChild(zoomOut);
  toolbar.appendChild(zoomReset);

  const viewport = document.createElement('div');
  viewport.className = 'mermaid-zoom-viewport';
  viewport.dataset.scale = '1';
  viewport.dataset.translateX = '0';
  viewport.dataset.translateY = '0';

  wrapper.appendChild(toolbar);
  wrapper.appendChild(viewport);

  const MIN_SCALE = 0.25;
  const MAX_SCALE = 4;
  const SCALE_STEP = 0.25;

  function applyTransform() {
    const s = parseFloat(viewport.dataset.scale);
    const tx = parseFloat(viewport.dataset.translateX);
    const ty = parseFloat(viewport.dataset.translateY);
    viewport.style.transform = `scale(${s}) translate(${tx}px, ${ty}px)`;
  }

  zoomIn.addEventListener('click', (e) => {
    e.stopPropagation();
    const s = Math.min(MAX_SCALE, parseFloat(viewport.dataset.scale) + SCALE_STEP);
    viewport.dataset.scale = s;
    applyTransform();
  });

  zoomOut.addEventListener('click', (e) => {
    e.stopPropagation();
    const s = Math.max(MIN_SCALE, parseFloat(viewport.dataset.scale) - SCALE_STEP);
    viewport.dataset.scale = s;
    applyTransform();
  });

  zoomReset.addEventListener('click', (e) => {
    e.stopPropagation();
    viewport.dataset.scale = '1';
    viewport.dataset.translateX = '0';
    viewport.dataset.translateY = '0';
    applyTransform();
  });

  // Scroll wheel zoom
  wrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, parseFloat(viewport.dataset.scale) + delta));
    viewport.dataset.scale = s;
    applyTransform();
  }, { passive: false });

  // Pan via mouse drag
  let isPanning = false;
  let startX, startY;

  wrapper.addEventListener('mousedown', (e) => {
    if (e.target.closest('.mermaid-zoom-btn')) return;
    isPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    wrapper.style.cursor = 'grabbing';
    viewport.classList.add('is-panning');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const scale = parseFloat(viewport.dataset.scale);
    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;
    viewport.dataset.translateX = parseFloat(viewport.dataset.translateX) + dx;
    viewport.dataset.translateY = parseFloat(viewport.dataset.translateY) + dy;
    startX = e.clientX;
    startY = e.clientY;
    applyTransform();
  });

  document.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      wrapper.style.cursor = '';
      viewport.classList.remove('is-panning');
    }
  });

  return { wrapper, viewport };
}

async function initMermaid(scope) {
    const blocks = scope.querySelectorAll('pre code.language-mermaid');

    mermaid.initialize({ 
        startOnLoad: false,
        useMaxWidth: false,
        theme: isDark() ? "dark": "default"
    });

    blocks.forEach(async (block, i) => {
        const rawCode = block.textContent.trim()
        const pre = block.parentElement;
        const container = document.createElement('div');
        container.className = 'mermaid';
        container.setAttribute('data-original-code', rawCode);

        // Check if this is inside a preview popup — skip zoom wrapper for previews
        const isPreview = pre.closest('.preview');

        if (isPreview) {
            pre.parentNode.replaceChild(container, pre);
        } else {
            const { wrapper, viewport } = createZoomWrapper(container);
            viewport.appendChild(container);
            pre.parentNode.replaceChild(wrapper, pre);
        }

        try {
            const id = `mermaid-svg-${i}`;
            const { svg } = await mermaid.render(id, rawCode);
            container.innerHTML = svg;

            const svgElement = container.querySelector('svg');
            svgElement.removeAttribute('width');
            svgElement.removeAttribute('height');
            svgElement.style.width = '100%';
            svgElement.style.maxWidth = '100%';
        } catch (error) {
            console.error("Mermaid render failed:", error);
            container.innerHTML = '<p style="color:red">Diagram error</p>';
        }
    });
}


initMermaid(document);