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
  zoomReset.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/></svg>';

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
  wrapper.addEventListener('mousedown', (e) => {
    if (e.target.closest('.mermaid-zoom-btn')) return;
    let startX = e.clientX;
    let startY = e.clientY;
    wrapper.style.cursor = 'grabbing';
    viewport.classList.add('is-panning');
    e.preventDefault();

    const panController = new AbortController();
    const { signal } = panController;

    document.addEventListener('mousemove', (e) => {
      const scale = parseFloat(viewport.dataset.scale);
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      viewport.dataset.translateX = parseFloat(viewport.dataset.translateX) + dx;
      viewport.dataset.translateY = parseFloat(viewport.dataset.translateY) + dy;
      startX = e.clientX;
      startY = e.clientY;
      applyTransform();
    }, { signal });

    document.addEventListener('mouseup', () => {
      wrapper.style.cursor = '';
      viewport.classList.remove('is-panning');
      panController.abort();
    }, { signal, once: true });
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