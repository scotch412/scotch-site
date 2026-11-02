/**
 * STRATA — Filmmaker Multi-Plane Parallax & Layer Tracking Engine
 * Tracks cinema layers, updates timecodes & HUD, and applies parallax to visual planes
 */

class StrataEngine {
  constructor() {
    this.layers = Array.from(document.querySelectorAll('.strata-layer'));
    this.progressBar = document.getElementById('scroll-progress-bar');
    this.timecodeVal = document.getElementById('timecode-val');

    this.currentLayerIndex = 0;
    this.ticking = false;

    this.layerData = [
      { id: 'layer-0', num: '00', title: 'PROLOGUE', tc: '00:00:00:00' },
      { id: 'layer-portrait', num: '01', title: 'CINESTILL', tc: '00:14:22:18' },
      { id: 'layer-tv', num: '02', title: 'TRANSMISSION', tc: '00:28:40:12' },
      { id: 'layer-lotr', num: '03', title: 'FELLOWSHIP', tc: '01:02:14:18' },
      { id: 'layer-notebook', num: '04', title: 'FIELD JOURNAL', tc: '01:34:10:05' },
      { id: 'layer-5', num: '05', title: 'INQUIRIES', tc: '01:50:30:00' }
    ];

    this.init();
  }

  init() {
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });
    window.addEventListener('resize', () => this.onScroll(), { passive: true });

    this.update();
  }

  onScroll() {
    if (!this.ticking) {
      window.requestAnimationFrame(() => {
        this.update();
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  update() {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;

    // 1. Update Progress Bar
    if (this.progressBar) {
      this.progressBar.style.width = `${Math.min(100, Math.max(0, scrollPercent))}%`;
    }

    // 2. Identify Current Active Cinema Layer
    const viewportMiddle = window.innerHeight * 0.45;
    let activeIdx = 0;

    this.layers.forEach((layer, index) => {
      const rect = layer.getBoundingClientRect();
      if (rect.top <= viewportMiddle && rect.bottom > viewportMiddle) {
        activeIdx = index;
      }

      // Scroll-linked parallax drift on background media removed: layers stay static while scrolling.
    });

    if (activeIdx !== this.currentLayerIndex) {
      this.currentLayerIndex = activeIdx;
      this.onLayerChange(activeIdx);
    }
  }

  onLayerChange(index) {
    const data = this.layerData[index] || this.layerData[0];

    // Update Layer active state
    this.layers.forEach((layer, i) => {
      if (i === index) {
        layer.classList.add('is-active');
      } else {
        layer.classList.remove('is-active');
      }
    });
  }

  scrollToLayer(index) {
    const targetLayer = this.layers[index];
    if (targetLayer) {
      targetLayer.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

window.StrataEngine = StrataEngine;
