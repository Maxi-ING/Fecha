const TAU = Math.PI * 2;
const COLORS = ['#9e1230', '#ba1034', '#cf1035', '#e01a3e', '#ed3c63', '#f26b8b', '#f49fb0', '#fff0e9'];
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const ease = n => 1 - Math.pow(1 - clamp(n), 3);

function random(seed = 97) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/** A real vector heart. Each leaf remains sharp at high pixel densities. */
export function heart(ctx, x, y, size, rotation, color, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(size, size);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, .9);
  ctx.bezierCurveTo(-.35, .55, -1, .05, -1, -.45);
  ctx.bezierCurveTo(-1, -1.12, -.25, -1.22, 0, -.65);
  ctx.bezierCurveTo(.25, -1.22, 1, -1.12, 1, -.45);
  ctx.bezierCurveTo(1, .05, .35, .55, 0, .9);
  ctx.fill();
  ctx.restore();
}

/** Deterministic organic branches and a dense, heart-shaped canopy. */
export function makeTree() {
  const rnd = random();
  const branches = [];
  function branch(x, y, length, angle, width, depth, start) {
    const bend = (rnd() - .5) * .4;
    const ex = x + Math.cos(angle + bend) * length;
    const ey = y + Math.sin(angle + bend) * length;
    branches.push({ x, y, ex, ey, cx: x + Math.cos(angle) * length * .43, cy: y + Math.sin(angle) * length * .5, width, start, duration: .55 + length / 170 });
    if (depth <= 0) return;
    branch(ex, ey, length * (.64 + rnd() * .09), angle - .35 - rnd() * .32, width * .65, depth - 1, start + .45);
    branch(ex, ey, length * (.62 + rnd() * .12), angle + .27 + rnd() * .42, width * .63, depth - 1, start + .5);
  }
  branch(325, 578, 146, -1.55, 23, 6, .3);
  const leaves = [];
  while (leaves.length < 1450) {
    const x = (rnd() - .5) * 2.4;
    const y = (rnd() - .5) * 2.4;
    if (Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y > 0) continue;
    const px = 325 + x * 174;
    const py = 260 - y * 159;
    const colorIndex = Math.floor(rnd() * 7.4);
    leaves.push({
      x: px, y: py, size: 3.1 + rnd() * 4.8,
      angle: (rnd() - .5) * 1.7,
      color: COLORS[colorIndex],
      delay: 2 + ((578 - py) / 510) * 1.9 + rnd() * 1.7,
      phase: rnd() * TAU, depth: rnd(),
    });
  }
  // Sort by depth so small pale leaves peek through the rich foreground.
  leaves.sort((a, b) => a.depth - b.depth);
  const falling = Array.from({ length: 34 }, () => ({
    phase: rnd(), duration: 8 + rnd() * 10,
    x: 130 + rnd() * 375, y: 90 + rnd() * 260,
    size: 2.5 + rnd() * 3.5, sway: 15 + rnd() * 45,
    color: COLORS[Math.floor(rnd() * 7)], angle: rnd() * TAU,
  }));
  return { branches, leaves, falling };
}

/** Render in a 650×620 logical space, independent of screen/device size. */
export function drawTree(ctx, tree, seconds, reducedMotion = false) {
  const t = reducedMotion ? 30 : Math.max(0, seconds - .8);
  ctx.clearRect(0, 0, 650, 620);
  if (!reducedMotion && seconds < .95) {
    const p = clamp(seconds / .8);
    heart(ctx, 325, 350 + p * p * 228, 13 * (1 - p * .8), 0, COLORS[1], 1 - clamp((seconds - .75) / .2));
  }
  for (const b of tree.branches) {
    const progress = ease((t - b.start) / b.duration);
    if (!progress) continue;
    // A tapered quadratic curve, revealed outward from its parent branch.
    for (let i = 0; i < 22; i++) {
      const a = i / 22;
      const z = Math.min((i + 1) / 22, progress);
      if (a > progress) break;
      const at = p => ({ x: (1 - p) ** 2 * b.x + 2 * (1 - p) * p * b.cx + p ** 2 * b.ex, y: (1 - p) ** 2 * b.y + 2 * (1 - p) * p * b.cy + p ** 2 * b.ey });
      const p1 = at(a), p2 = at(z);
      const mid = at((a + z) / 2);
      const hx = (mid.x - 325) / 174, hy = (260 - mid.y) / 159;
      // Keep the fine twigs inside the canopy's silhouette.
      if (b.width < 10 && Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * hy * hy * hy > 0) continue;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = Math.max(.45, b.width * (1 - a * .5));
      ctx.strokeStyle = b.width > 12 ? '#78502f' : '#92603b';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
  for (const leaf of tree.leaves) {
    const p = ease((t - leaf.delay) / .9);
    if (!p) continue;
    const sway = reducedMotion ? 0 : Math.sin(t * .8 + leaf.phase) * .9;
    heart(ctx, leaf.x + sway, leaf.y + (1 - p) * 14, leaf.size * p, leaf.angle + sway * .025, leaf.color, p);
  }
  if (!reducedMotion) drawFallingHearts(ctx, tree, t);
  // A few fallen leaves rest on the baseline.
  for (let i = 0; i < 7; i++) {
    const p = ease((t - 7 - i * .6) / 1.5);
    if (p) heart(ctx, 110 + i * 52, 577 + (i % 2) * 2, 2.3 + i % 3, i * 1.7, COLORS[i], p * .75);
  }
}

function drawFallingHearts(ctx, tree, t) {
  if (t <= 5.5) return;
  for (const petal of tree.falling) {
    const raw = (t - 5.5) / petal.duration + petal.phase;
    const p = raw % 1;
    const y = petal.y + p * (595 - petal.y);
    const x = petal.x - p * 230 + Math.sin(p * 7 + petal.angle) * petal.sway;
    const opacity = clamp(p * 8) * clamp((1 - p) * 9) * .85;
    heart(ctx, x, y, petal.size, petal.angle + p * 4, petal.color, opacity);
  }
}

export class HeartTree {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tree = makeTree();
    this.frame = 0;
    this.startedAt = null;
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.visible = true;
    this.cache = null;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.visibility = () => {
      this.visible = !document.hidden;
      if (this.visible) this.draw();
      else cancelAnimationFrame(this.frame);
    };
    document.addEventListener('visibilitychange', this.visibility);
    this.motion.addEventListener('change', () => this.draw());
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.cache = null;
    this.draw();
  }
  start() { this.startedAt = performance.now(); this.cache = null; this.draw(); }
  draw() {
    cancelAnimationFrame(this.frame);
    if (!this.ctx || this.startedAt === null || !this.visible) return;
    const elapsed = (performance.now() - this.startedAt) / 1000;
    const sx = this.canvas.width / 650, sy = this.canvas.height / 620;
    this.ctx.setTransform(sx, 0, 0, sy, 0, 0);
    if (elapsed > 9 && !this.motion.matches) {
      // Once the tree is grown, reuse its vector render and animate only the falling leaves.
      if (!this.cache) {
        this.cache = document.createElement('canvas');
        this.cache.width = this.canvas.width;
        this.cache.height = this.canvas.height;
        const cached = this.cache.getContext('2d');
        cached.setTransform(sx, 0, 0, sy, 0, 0);
        drawTree(cached, this.tree, 30, true);
      }
      this.ctx.clearRect(0, 0, 650, 620);
      this.ctx.drawImage(this.cache, 0, 0, 650, 620);
      drawFallingHearts(this.ctx, this.tree, elapsed - .8);
    } else drawTree(this.ctx, this.tree, elapsed, this.motion.matches);
    if (!this.motion.matches) this.frame = requestAnimationFrame(() => this.draw());
  }
}
