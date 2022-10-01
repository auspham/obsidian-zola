const cache = new Map();

async function showPreview(mouseEvent, link) {
    let previewDiv = createPreview();

    previewDiv.innerHTML = "Loading...";

    const { top, left} = getPreviewPosition(link);
    previewDiv.style.top = `${top}px`;
    previewDiv.style.left = `${left}px`;

    const html = cache.get(link.href);
    if (!html) {
        const response = await fetch(`${link.href}`);
        const rawHTML = await response.text();
        let doc = new DOMParser().parseFromString(rawHTML, "text/html");
        let docContent = doc.querySelector(".docs-content");
        previewDiv.innerHTML = docContent.innerHTML;

        let blockId = link.href.match(/(?<=#).{6}/);

        if (blockId != null) {
            blockId = [blockId];
            const blockContent = [
                ...docContent.querySelectorAll(
                    "p, li, h1, h2, h3, h4, h5, h6"
                ),
            ].findLast((e) => {
                return e.textContent.includes(`^${blockId}`);
            });

            if (blockContent) {
                previewDiv.innerHTML = blockContent.outerHTML;
            }
        }
        updateCallOut(previewDiv)
        cache.set(link.href, previewDiv.innerHTML);
        initPreview(`.${getPreviewUniqueClass(previewDiv)} a`);
    } else {
        previewDiv.innerHTML = html;
        initPreview(`.${getPreviewUniqueClass(previewDiv)} a`);
    }


    await initMermaid(previewDiv)

    previewDiv.addEventListener("mouseleave", () => {
        handleMouseLeave();
    });

    previewDiv.addEventListener("wheel", (e) => {
      const { scrollHeight, clientHeight } = previewDiv;

      if (scrollHeight <= clientHeight) {
        e.preventDefault();
      }
    }, { passive: false });

    link.addEventListener(
        "mouseleave",
        () => {
          setTimeout(() => {
            if (!previewDiv.matches(":hover")) {
                hidePreview(previewDiv);
            }
          }, 100);
        },
        false
    );
}

function getPreviewPosition(link) {
    const {x, y} = link.getBoundingClientRect()

    const offset = 25, previewDivHeight = 300;
    const boundaryY = window.innerHeight;
    const overflowBottom = y + offset + previewDivHeight > boundaryY;
    const position = { top: offset, left: x };

    if (!overflowBottom) {
        position.top = y + offset;
    } else {
        position.top = y - previewDivHeight;
    }

    return position;
}

function handleMouseLeave() {
    setTimeout(() => {
        const allPreviews = document.querySelectorAll(".preview");
        for (let i = allPreviews.length - 1; i >= 0; i--) {
            const curr = allPreviews[i];
            if (curr.matches(":hover")) {
                break;
            }
            hidePreview(curr);
        }
    }, 300);
}

function getPreviewUniqueClass(previewDiv) {
    return previewDiv.classList.item(previewDiv.classList.length - 1);
}

function isDocLink(href) {
    const test = new URL(href);
    return test.pathname.startsWith("/docs/");
}

function hidePreview(previewDiv) {
    try {
        document.body.removeChild(previewDiv);
    } catch (e) {}
}

function createPreview() {
    const previewDiv = document.createElement("div");
    const uniqueClassName = (Math.random() + 1).toString(36).substring(7);
    previewDiv.classList.add("preview");
    previewDiv.classList.add(`preview_${uniqueClassName}`);
    document.querySelector("body").appendChild(previewDiv);
    return previewDiv;
}

function initPreview(query = ".docs-content a") {
    document.querySelectorAll(query).forEach((a) => {
        if (isDocLink(a.href)) {
            a.addEventListener("mouseover", (e) => showPreview(e, a), false);
        }
    });
}

initPreview();
