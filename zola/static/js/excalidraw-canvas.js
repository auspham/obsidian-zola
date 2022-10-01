/**
 * ExcalidrawCanvas - Custom pan/zoom viewer with infinite grid background
 * Replaces svg-pan-zoom for Excalidraw SVG rendering
 */
class ExcalidrawCanvas {
  constructor(container, svg) {
    this.container = container;
    this.svg = svg;

    // Transform state
    this.scale = 1;
    this.minScale = 0.05;
    this.maxScale = 10;
    this.panX = 0;
    this.panY = 0;

    // Drag state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.panStartX = 0;
    this.panStartY = 0;

    // Pinch state
    this.lastPinchDist = 0;

    // Grid settings
    this.gridSize = 20;
    this.gridColor = "rgba(0, 0, 0, 0.08)";
    this.gridColorBold = "rgba(0, 0, 0, 0.15)";
    this.bgColor = "#f8f9fa";

    this._init();
  }

  _init() {
    // Build DOM structure
    this.wrapper = document.createElement("div");
    this.wrapper.className = "ec-wrapper";

    this.canvas = document.createElement("canvas");
    this.canvas.className = "ec-grid";
    this.wrapper.appendChild(this.canvas);

    this.svgLayer = document.createElement("div");
    this.svgLayer.className = "ec-svg-layer";
    this.svgLayer.appendChild(this.svg);
    this.wrapper.appendChild(this.svgLayer);

    // Zoom controls
    this.controls = document.createElement("div");
    this.controls.className = "ec-controls";
    this.controls.innerHTML = `
      <button class="ec-btn" data-action="zoom-in" title="Zoom in">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3a.5.5 0 0 1 .5.5v4h4a.5.5 0 0 1 0 1h-4v4a.5.5 0 0 1-1 0v-4h-4a.5.5 0 0 1 0-1h4v-4A.5.5 0 0 1 8 3z"/></svg>
      </button>
      <button class="ec-btn" data-action="zoom-out" title="Zoom out">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 8a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5z"/></svg>
      </button>
      <button class="ec-btn" data-action="reset" title="Fit to view">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 1 0V2h3.5a.5.5 0 0 0 0-1h-4zm13 0h-4a.5.5 0 0 0 0 1H14v3.5a.5.5 0 0 0 1 0v-4a.5.5 0 0 0-.5-.5zM1 14.5v-4a.5.5 0 0 1 1 0V14h3.5a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm14 0a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1 0-1H14v-3.5a.5.5 0 0 1 1 0v4z"/></svg>
      </button>
    `;
    this.wrapper.appendChild(this.controls);

    // Zoom percentage display
    this.zoomLabel = document.createElement("div");
    this.zoomLabel.className = "ec-zoom-label";
    this.zoomLabel.textContent = "100%";
    this.wrapper.appendChild(this.zoomLabel);

    this.container.appendChild(this.wrapper);

    // Setup SVG - preserve natural dimensions from excalidraw export
    // so the transform-based pan/zoom works correctly.
    // Read intrinsic size from attributes or viewBox before any changes.
    const vb = this.svg.viewBox?.baseVal;
    const attrW = parseFloat(this.svg.getAttribute("width"));
    const attrH = parseFloat(this.svg.getAttribute("height"));

    if (attrW && attrH) {
      this.svgNaturalW = attrW;
      this.svgNaturalH = attrH;
    } else if (vb && vb.width > 0) {
      this.svgNaturalW = vb.width;
      this.svgNaturalH = vb.height;
    } else {
      this.svgNaturalW = 800;
      this.svgNaturalH = 600;
    }

    // Set explicit pixel size so SVG renders at its natural size.
    // The parent div's CSS transform handles scaling.
    this.svg.setAttribute("width", this.svgNaturalW);
    this.svg.setAttribute("height", this.svgNaturalH);
    this.svg.style.width = this.svgNaturalW + "px";
    this.svg.style.height = this.svgNaturalH + "px";
    this.svg.style.display = "block";

    // Detect dark mode
    this._updateTheme();
    this._observeTheme();

    // Bind events
    this._bindEvents();

    // Initial sizing & center
    requestAnimationFrame(() => {
      this._resize();
      if (this._pendingState) {
        this.scale = this._pendingState.scale;
        this.panX = this._pendingState.panX;
        this.panY = this._pendingState.panY;
        this._pendingState = null;
      } else {
        this._fitContent();
      }
      this._render();
    });
  }

  _updateTheme() {
    const isDark = document.body.classList.contains("dark");
    if (isDark) {
      this.bgColor = "#1e1e1e";
      this.gridColor = "rgba(255, 255, 255, 0.06)";
      this.gridColorBold = "rgba(255, 255, 255, 0.12)";
    } else {
      this.bgColor = "#f8f9fa";
      this.gridColor = "rgba(0, 0, 0, 0.08)";
      this.gridColorBold = "rgba(0, 0, 0, 0.15)";
    }
  }

  _observeTheme() {
    this._themeObserver = new MutationObserver(() => {
      this._updateTheme();
      this._render();
    });
    this._themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  _bindEvents() {
    // Mouse wheel zoom
    this.wrapper.addEventListener("wheel", (e) => this._onWheel(e), { passive: false });

    // Mouse drag
    this.wrapper.addEventListener("mousedown", (e) => this._onMouseDown(e));
    window.addEventListener("mousemove", (e) => this._onMouseMove(e));
    window.addEventListener("mouseup", (e) => this._onMouseUp(e));

    // Touch
    this.wrapper.addEventListener("touchstart", (e) => this._onTouchStart(e), { passive: false });
    this.wrapper.addEventListener("touchmove", (e) => this._onTouchMove(e), { passive: false });
    this.wrapper.addEventListener("touchend", (e) => this._onTouchEnd(e));

    // Controls
    this.controls.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === "zoom-in") this._zoomBy(1.3);
      if (action === "zoom-out") this._zoomBy(1 / 1.3);
      if (action === "reset") this._fitContent();
    });

    // Resize
    this._resizeObserver = new ResizeObserver(() => {
      this._resize();
      this._render();
    });
    this._resizeObserver.observe(this.wrapper);
  }

  _resize() {
    const rect = this.wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";
    this.ctx = this.canvas.getContext("2d");
    this.ctx.scale(dpr, dpr);
    this.viewWidth = rect.width;
    this.viewHeight = rect.height;
  }

  _fitContent() {
    const vb = this.svg.viewBox?.baseVal;
    const contentW = this.svgNaturalW;
    const contentH = this.svgNaturalH;

    const padding = 60;
    const scaleX = (this.viewWidth - padding * 2) / contentW;
    const scaleY = (this.viewHeight - padding * 2) / contentH;
    this.scale = Math.min(scaleX, scaleY, 2);
    this.scale = Math.max(this.scale, this.minScale);

    // Center the content
    this.panX = (this.viewWidth - contentW * this.scale) / 2;
    this.panY = (this.viewHeight - contentH * this.scale) / 2;

    if (vb && vb.width > 0) {
      this.panX -= vb.x * this.scale;
      this.panY -= vb.y * this.scale;
    }

    this._render();
  }

  _drawGrid() {
    const ctx = this.ctx;
    const w = this.viewWidth;
    const h = this.viewHeight;

    // Background
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, w, h);

    const baseGrid = this.gridSize;
    // Adaptive grid sizing: as you zoom out, grid snaps to larger intervals
    let effectiveGrid = baseGrid * this.scale;
    while (effectiveGrid < 10) effectiveGrid *= 5;
    while (effectiveGrid > 100) effectiveGrid /= 5;

    const boldEvery = 5;
    const offsetX = this.panX % effectiveGrid;
    const offsetY = this.panY % effectiveGrid;

    // Determine which grid line index we start at for bold calculation
    const startIdxX = Math.floor(-this.panX / effectiveGrid);
    const startIdxY = Math.floor(-this.panY / effectiveGrid);

    // Thin lines
    ctx.beginPath();
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;

    for (let x = offsetX, i = 0; x < w; x += effectiveGrid, i++) {
      if ((startIdxX + i) % boldEvery === 0) continue;
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
    }
    for (let y = offsetY, i = 0; y < h; y += effectiveGrid, i++) {
      if ((startIdxY + i) % boldEvery === 0) continue;
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
    }
    ctx.stroke();

    // Bold lines
    ctx.beginPath();
    ctx.strokeStyle = this.gridColorBold;
    ctx.lineWidth = 1;

    for (let x = offsetX, i = 0; x < w; x += effectiveGrid, i++) {
      if ((startIdxX + i) % boldEvery !== 0) continue;
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
    }
    for (let y = offsetY, i = 0; y < h; y += effectiveGrid, i++) {
      if ((startIdxY + i) % boldEvery !== 0) continue;
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
    }
    ctx.stroke();
  }

  _render() {
    this._drawGrid();
    this.svgLayer.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    this.zoomLabel.textContent = Math.round(this.scale * 100) + "%";
  }

  // --- Zoom ---

  _zoomBy(factor, centerX, centerY) {
    centerX = centerX ?? this.viewWidth / 2;
    centerY = centerY ?? this.viewHeight / 2;

    const newScale = Math.min(Math.max(this.scale * factor, this.minScale), this.maxScale);
    const realFactor = newScale / this.scale;

    // Zoom towards cursor
    this.panX = centerX - (centerX - this.panX) * realFactor;
    this.panY = centerY - (centerY - this.panY) * realFactor;
    this.scale = newScale;

    this._render();
  }

  _onWheel(e) {
    e.preventDefault();
    const rect = this.wrapper.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Normalize delta
    let delta = -e.deltaY;
    if (e.deltaMode === 1) delta *= 40; // lines
    if (e.deltaMode === 2) delta *= 800; // pages

    const factor = Math.pow(1.002, delta);
    this._zoomBy(factor, mx, my);
  }

  // --- Mouse drag ---

  _onMouseDown(e) {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.panStartX = this.panX;
    this.panStartY = this.panY;
    this.wrapper.style.cursor = "grabbing";
    e.preventDefault();
  }

  _onMouseMove(e) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    this.panX = this.panStartX + dx;
    this.panY = this.panStartY + dy;
    this._render();
  }

  _onMouseUp() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.wrapper.style.cursor = "";
  }

  // --- Touch ---

  _getTouchCenter(touches) {
    let x = 0, y = 0;
    for (let i = 0; i < touches.length; i++) {
      x += touches[i].clientX;
      y += touches[i].clientY;
    }
    return { x: x / touches.length, y: y / touches.length };
  }

  _getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _onTouchStart(e) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.dragStartX = e.touches[0].clientX;
      this.dragStartY = e.touches[0].clientY;
      this.panStartX = this.panX;
      this.panStartY = this.panY;
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      this.lastPinchDist = this._getTouchDist(e.touches);
      this.pinchCenter = this._getTouchCenter(e.touches);
      this.pinchPanStartX = this.panX;
      this.pinchPanStartY = this.panY;
    }
    e.preventDefault();
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.dragStartX;
      const dy = e.touches[0].clientY - this.dragStartY;
      this.panX = this.panStartX + dx;
      this.panY = this.panStartY + dy;
      this._render();
    } else if (e.touches.length === 2) {
      const dist = this._getTouchDist(e.touches);
      const center = this._getTouchCenter(e.touches);
      const rect = this.wrapper.getBoundingClientRect();
      const cx = center.x - rect.left;
      const cy = center.y - rect.top;

      const factor = dist / this.lastPinchDist;
      this._zoomBy(factor, cx, cy);
      this.lastPinchDist = dist;
    }
  }

  _onTouchEnd(e) {
    if (e.touches.length < 2) {
      this.isDragging = false;
    }
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.dragStartX = e.touches[0].clientX;
      this.dragStartY = e.touches[0].clientY;
      this.panStartX = this.panX;
      this.panStartY = this.panY;
    }
  }

  getState() {
    return { scale: this.scale, panX: this.panX, panY: this.panY };
  }

  restoreState(state) {
    if (!state) return;
    // Store as pending — the requestAnimationFrame in _init will pick it up
    this._pendingState = state;
  }

  destroy() {
    this._resizeObserver?.disconnect();
    this._themeObserver?.disconnect();
  }
}
