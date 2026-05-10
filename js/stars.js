export function createStars(canvas, getSettings) {
  const ctx = canvas.getContext('2d');
  let stars = [];
  let meteors = [];
  let lastMeteorAt = 0;
  let dpr = window.devicePixelRatio || 1;
  let w = 0, h = 0;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildStars();
  }

  function rebuildStars() {
    const s = getSettings().bg;
    stars = new Array(s.starDensity | 0).fill(0).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * s.starMaxSize + 0.2,
      a: Math.random() * 0.6 + 0.2,
      tw: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2
    }));
  }

  function spawnMeteor() {
    const s = getSettings().bg;
    const startX = w * (0.5 + Math.random() * 0.5);
    const startY = -20;
    const angle = Math.PI * 0.78; // toward bottom-left
    meteors.push({
      x: startX,
      y: startY,
      vx: -Math.cos(Math.PI - angle) * s.meteorSpeed,
      vy: Math.sin(Math.PI - angle) * s.meteorSpeed,
      length: s.meteorLength,
      life: 0,
      maxLife: 240
    });
  }

  function frame(t) {
    const s = getSettings().bg;
    ctx.clearRect(0, 0, w, h);

    for (const star of stars) {
      star.phase += star.tw;
      const tw = (Math.sin(star.phase) + 1) / 2; // 0..1
      const alpha = star.a * (0.6 + 0.4 * tw) * s.starBrightness;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (t - lastMeteorAt > s.meteorFrequency * 1000) {
      spawnMeteor();
      lastMeteorAt = t;
    }

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx; m.y += m.vy; m.life++;
      const tailX = m.x - m.vx * (m.length / Math.hypot(m.vx, m.vy));
      const tailY = m.y - m.vy * (m.length / Math.hypot(m.vx, m.vy));
      const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.4)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.arc(m.x, m.y, 1.4, 0, Math.PI * 2);
      ctx.fill();

      if (m.x < -m.length || m.y > h + m.length || m.life > m.maxLife) {
        meteors.splice(i, 1);
      }
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  return {
    rebuild: rebuildStars
  };
}
