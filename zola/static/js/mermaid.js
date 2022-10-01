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
        pre.parentNode.replaceChild(container, pre);
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