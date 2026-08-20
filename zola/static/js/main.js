// Set darkmode
function isDark() {
    return document.body.classList.contains("dark");
}

document.getElementById("mode").addEventListener("click", () => {
    document.body.classList.toggle("dark");

    localStorage.setItem("theme", isDark() ? "dark" : "light");

    // Update graph colors if exists
    if (typeof graph !== "undefined" && typeof graph.setOptions === "function") {
        graph.setOptions({
            nodes: {
                color: isDark() ? "#555" : "#d4d4d4",
                font: {
                    color: isDark() ? "#bababa" : "#5a5a5a",
                    strokeColor: isDark() ? "#bababa" : "#5a5a5a",
                },
            },
        });
    }

    updateMermaidTheme(isDark() ? "dark": "default")
});


function updateCallOut(scope) {
    scope.querySelectorAll('blockquote').forEach(bq => {
        const firstParagraph = bq.firstElementChild;
        const marker = firstParagraph?.firstChild;
        if (firstParagraph?.tagName !== 'P' || marker?.nodeType !== Node.TEXT_NODE) {
            return;
        }

        const match = marker.textContent.match(/^\s*\[!([\w-]+)\][+-]?\s*(.*)$/i);
        if (!match) {
            return;
        }

        const type = match[1].toLowerCase();
        const title = match[2].trim() || type.charAt(0).toUpperCase() + type.slice(1);
        const titleElement = document.createElement('div');
        titleElement.className = 'callout-title';
        titleElement.textContent = title;

        marker.remove();
        if (firstParagraph.firstElementChild?.tagName === 'BR') {
            firstParagraph.firstElementChild.remove();
        }
        if (!firstParagraph.textContent.trim() && !firstParagraph.children.length) {
            firstParagraph.remove();
        }

        bq.classList.add('callout', `callout-${type}`);
        bq.prepend(titleElement);
    });
}

updateCallOut(document);


window.addEventListener('load', () => {
    const sidebar = document.querySelector('.docs-links'); 
    if (!sidebar) return;

    const activeLink = sidebar.querySelector('.list-unstyled .active');
    if (activeLink) {
        const targetScrollPos = activeLink.offsetTop - (sidebar.clientHeight / 2);
        sidebar.scrollTo({
            top: targetScrollPos,
            behavior: 'smooth'
        });
    }
});


document.querySelectorAll('table').forEach(table => {
  // Create the wrapper element
  const wrapper = document.createElement('div');
  wrapper.classList.add('table-container');
  
  // Insert the wrapper before the table and move the table inside it
  table.parentNode.insertBefore(wrapper, table);
  wrapper.appendChild(table);
});

// Shared resize helpers
var _resizeSidebar = document.querySelector('.docs-sidebar');
var _resizeToc = document.querySelector('.docs-toc');
var _mainGrid = document.querySelector('.main-grid');
var MIN_CONTENT = 500; // matches CSS minmax(500px, 1fr) on the content column

function getGridWidth() {
  // .main-grid has overflow-x:hidden so clientWidth is the true usable width
  return _mainGrid ? _mainGrid.clientWidth : document.documentElement.clientWidth;
}

function getGridGap() {
  if (!_mainGrid) return 0;
  var gap = parseFloat(getComputedStyle(_mainGrid).columnGap);
  return isNaN(gap) ? 0 : gap;
}

function getMaxSidebarWidth() {
  var gridW = getGridWidth();
  var gap = getGridGap();
  var tocW = _resizeToc ? _resizeToc.offsetWidth : 0;
  // gridW = sidebar + gap + content(min 500) + gap + toc
  var max = gridW - gap * 2 - MIN_CONTENT - tocW;
  return Math.max(150, Math.floor(max));
}

function getMaxTocWidth() {
  var gridW = getGridWidth();
  var gap = getGridGap();
  var sidebarW = _resizeSidebar ? _resizeSidebar.offsetWidth : 0;
  // gridW = sidebar + gap + content(min 500) + gap + toc
  var max = gridW - gap * 2 - MIN_CONTENT - sidebarW;
  return Math.max(200, Math.floor(max));
}

// Sidebar drag-to-resize
(function() {
  var handle = document.querySelector('.sidebar-resize-handle');
  var sidebar = _resizeSidebar;
  if (!handle || !sidebar) return;

  var startX, startWidth;

  handle.addEventListener('mousedown', function(e) {
    e.preventDefault();
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    handle.classList.add('dragging');
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  function onDrag(e) {
    var newWidth = startWidth + (e.clientX - startX);
    var maxW = getMaxSidebarWidth();
    if (newWidth < 150) newWidth = 150;
    if (newWidth > maxW) newWidth = maxW;
    var w = newWidth + 'px';
    sidebar.style.width = w;
    sidebar.style.minWidth = w;
    sidebar.style.maxWidth = w;
  }

  function stopDrag() {
    handle.classList.remove('dragging');
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem('sidebar-width', sidebar.style.width);
  }
})();

// TOC drag-to-resize
(function() {
  var handle = document.querySelector('.toc-resize-handle');
  var toc = _resizeToc;
  if (!handle || !toc) return;

  var savedW = localStorage.getItem('toc-width');
  if (savedW) {
    toc.style.width = savedW;
    toc.style.minWidth = savedW;
    toc.style.maxWidth = savedW;
    toc.style.flex = 'none';
  }

  var startX, startWidth;

  handle.addEventListener('mousedown', function(e) {
    e.preventDefault();
    startX = e.clientX;
    startWidth = toc.offsetWidth;
    handle.classList.add('dragging');
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  function onDrag(e) {
    var newWidth = startWidth - (e.clientX - startX);
    var maxW = getMaxTocWidth();
    if (newWidth < 200) newWidth = 200;
    if (newWidth > maxW) newWidth = maxW;
    var w = newWidth + 'px';
    toc.style.width = w;
    toc.style.minWidth = w;
    toc.style.maxWidth = w;
    toc.style.flex = 'none';
  }

  function stopDrag() {
    handle.classList.remove('dragging');
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem('toc-width', toc.style.width);
  }
})();