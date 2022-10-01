(function () {
  "use strict";

  var tocNav = document.getElementById("TableOfContents");
  if (!tocNav) return;

  var tocLinks = tocNav.querySelectorAll("a[href]");
  if (!tocLinks.length) return;

  // Build a map from heading id -> TOC link(s)
  var linkMap = {};
  var headingIds = [];
  tocLinks.forEach(function (link) {
    var hash = link.hash;
    if (!hash) return;
    var id = decodeURIComponent(hash.slice(1));
    if (!linkMap[id]) {
      linkMap[id] = [];
      headingIds.push(id);
    }
    linkMap[id].push(link);
  });

  if (!headingIds.length) return;

  // Gather actual heading elements
  var headings = [];
  headingIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) headings.push(el);
  });

  if (!headings.length) return;

  var activeId = null;

  function setActive(id) {
    if (id === activeId) return;

    // Remove old active
    if (activeId && linkMap[activeId]) {
      linkMap[activeId].forEach(function (link) {
        link.classList.remove("active");
      });
    }

    // Set new active
    activeId = id;
    if (id && linkMap[id]) {
      linkMap[id].forEach(function (link) {
        link.classList.add("active");

        // Scroll the TOC container to keep active link visible
        var tocContainer = tocNav.closest(".page-links > div");
        if (tocContainer && link.offsetParent) {
          var linkTop = link.offsetTop - tocContainer.offsetTop;
          var containerH = tocContainer.clientHeight;
          var scrollTop = tocContainer.scrollTop;
          if (linkTop < scrollTop + 40 || linkTop > scrollTop + containerH - 40) {
            tocContainer.scrollTo({
              top: linkTop - containerH / 3,
              behavior: "smooth",
            });
          }
        }
      });
    }
  }

  // Use IntersectionObserver to track which headings are near the top
  var visibleHeadings = new Set();

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          visibleHeadings.add(entry.target.id);
        } else {
          visibleHeadings.delete(entry.target.id);
        }
      });

      // Pick the first visible heading in document order
      var found = null;
      for (var i = 0; i < headings.length; i++) {
        if (visibleHeadings.has(headings[i].id)) {
          found = headings[i].id;
          break;
        }
      }

      // If nothing visible, keep previous active (user scrolled past all)
      if (found !== null) {
        setActive(found);
      }
    },
    {
      // rootMargin: trigger when heading enters top 20% of viewport
      rootMargin: "0px 0px -80% 0px",
      threshold: 0,
    }
  );

  headings.forEach(function (h) {
    observer.observe(h);
  });

  // Activate the first heading initially if viewport is at top
  if (window.scrollY < 100 && headings.length) {
    setActive(headings[0].id);
  }
})();
