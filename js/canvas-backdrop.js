/**
 * STRATA — Generative Ambient Canvas Layer
 * Edge-to-edge procedural depth field with responsive particles & dynamic wave contours
 */

class AmbientCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.particles = [];
    this.numParticles = 55;
    this.mouseX = this.width / 2;
    this.mouseY = this.height / 2;
    this.targetMouseX = this.mouseX;
    this.targetMouseY = this.mouseY;
    this.scrollY = 0;
    this.time = 0;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.targetMouseX = e.clientX;
      this.targetMouseY = e.clientY;
    });

    window.addEventListener('scroll', () => {
      this.scrollY = window.scrollY;
    }, { passive: true });

    // Spawn particles
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: Math.random() * 2 + 0.5, // Depth scale
        radius: Math.random() * 1.6 + 0.6,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.4 + 0.15
      });
    }

    this.animate();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  animate() {
    this.time += 0.008;
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw subtle flowing topographical lines
    this.drawContours();

    // Draw floating depth particles
    this.drawParticles();

    requestAnimationFrame(() => this.animate());
  }

  drawContours() {
    const numLines = 5;
    const spacing = this.height / (numLines + 1);

    this.ctx.lineWidth = 1;

    for (let i = 0; i < numLines; i++) {
      const baseY = spacing * (i + 1) + (Math.sin(this.time + i) * 15);
      this.ctx.beginPath();
      
      const lineAlpha = 0.04 + (i * 0.015);
      this.ctx.strokeStyle = `rgba(229, 193, 139, ${lineAlpha})`;

      for (let x = 0; x <= this.width; x += 30) {
        const distToMouse = Math.hypot(x - this.mouseX, baseY - this.mouseY);
        const mouseEffect = Math.max(0, 1 - distToMouse / 350) * 25;
        
        const y = baseY + 
          Math.sin(x * 0.003 + this.time + i * 0.6) * 35 + 
          Math.cos(x * 0.006 - this.time * 0.5) * 15 - 
          mouseEffect;

        if (x === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();
    }
  }

  drawParticles() {
    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around bounds
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      // Parallax mouse displacement
      const dx = (this.mouseX - this.width / 2) * 0.015 * p.z;
      const dy = (this.mouseY - this.height / 2) * 0.015 * p.z;

      this.ctx.beginPath();
      this.ctx.arc(p.x + dx, p.y + dy, p.radius * p.z, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(229, 193, 139, ${p.alpha})`;
      this.ctx.fill();
    }
  }
}

// Export for module or global use
window.AmbientCanvas = AmbientCanvas;
