// Set darkmode
function isDark() {
    return document.body.classList.contains("dark");
}

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

document.getElementById("mode").addEventListener("click", () => {
    document.body.classList.toggle("dark");

    localStorage.setItem("theme", isDark() ? "dark" : "light");

    // Update graph colors if exists
    if (graph) {
        graph.setOptions({
            nodes: {
                color: isDark() ? "#8c8e91" : "#dee2e6",
                font: {
                    color: isDark() ? "#c9cdd1" : "#616469",
                    strokeColor: isDark() ? "#c9cdd1" : "#616469",
                },
            },
        });
    }

    updateMermaidTheme(isDark() ? "dark": "default")
});


// Collapsible sidebar code (it's ugly but I don't care)
var sections = $(".collapsible-section");
if (!sidebar_collapsed) {
    sections.addClass("open");
}

const openlink = document.querySelector("li a.active");
if (openlink) {
    let parentCollapsibleWrapper = openlink.closest("ul").closest("div");

    while (parentCollapsibleWrapper) {
        parentCollapsibleWrapper.classList.add("open");
        parentCollapsibleWrapper.previousSibling.classList.add("open");
        parentCollapsibleWrapper =
            parentCollapsibleWrapper.closest("ul") != null
                ? parentCollapsibleWrapper.closest("ul").closest("div")
                : null;
    }
}

// Add click listener to all collapsible sections
for (let i = 0; i < sections.length; i++) {
    // Initial setup
    let wrapper = $(sections[i].nextElementSibling);
    let wrapper_children = wrapper.find("> ul");

    if (wrapper_children.length > 0) {
        if (sidebar_collapsed && !wrapper.hasClass("open")) {
            wrapper.hide();
        } else {
            wrapper.addClass("open");
            wrapper.show();
        }
    }

    // Click listener
    sections[i].addEventListener("click", function () {
        // Toggle class
        this.classList.toggle("open");

        // Change wrapper height and class
        let wrapper = $(sections[i].nextElementSibling);
        let wrapper_children = wrapper.find("> ul");

        if (wrapper_children.length > 0) {
            let page_list = $(wrapper_children[0]);
            if (wrapper.hasClass("open")) {
                wrapper.removeClass("open");
                // wrapper.height(0);
                wrapper.hide();
            } else {
                wrapper.addClass("open");
                // wrapper.height(page_list.outerHeight(true));
                wrapper.show();
            }
        }
    });
}


document.querySelectorAll('blockquote').forEach(bq => {
  const content = bq.innerHTML.trim();
  
  const match = content.match(/^(?:<p>)?\[!(\w+)\]/i);

  if (match) {
    const type = match[1].toLowerCase();
    bq.classList.add('callout', `callout-${type}`);
    bq.innerHTML = content.replace(/^(?:<p>)?\[!(\w+)\](?:<br>)?/, 
      `<div class="callout-title">${type}</div><p>`);
  }
});


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