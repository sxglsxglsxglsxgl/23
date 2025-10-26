// Robust fullpage track-based nav + dots + centered overlay menu + intro
(function(){
  const sub = document.getElementById('heroSub');
  const burger = document.querySelector('.burger-bar');
  const slidesRoot = document.getElementById('slides');
  const track = document.getElementById('track');
  const dotsNav = document.getElementById('dots');
  const sections = Array.from(track.querySelectorAll('.slide'));
  let index = 0;
  let isAnimating = false;
  let startTouchY = null;
  let wheelAccum = 0;
  let lastNavAt = 0;
  const WHEEL_THRESHOLD = 60;
  const NAV_COOLDOWN = 400; // < 500ms tween; leaves small margin

  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

  // TYPEWRITER
  async function typewriter(node, text, {min=80, max=150, cursor=true}={}){
    node.textContent = '';
    if (cursor) node.style.borderRight = '1px solid #6b6b6b';
    for (const ch of text){
      node.textContent += ch;
      const jitter = Math.random() * (max - min) + min;
      const extra = (/[.,;:!?\s]/).test(ch) ? 28 : 0;
      // eslint-disable-next-line no-await-in-loop
      await sleep(jitter + extra);
    }
    if (cursor) node.style.borderRight = '1px solid transparent';
  }

  // LAYOUT
  function layout(){
    const h = window.innerHeight;
    track.style.height = `${sections.length * h}px`;
    sections.forEach((sec, i) => {
      sec.style.position = 'absolute';
      sec.style.top = `${i * h}px`;
      sec.style.left = '0';
      sec.style.right = '0';
      sec.style.bottom = 'auto';
    });
    track.style.transform = `translate3d(0, ${-index * h}px, 0)`;
  }
  window.addEventListener('resize', layout);

  // EASING + TWEEN
  function easeInOutCubic(t){ return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2; }
  function tweenTo(targetIndex, duration=500){
    if (isAnimating) return Promise.resolve();
    isAnimating = true;
    const start = performance.now();
    const h = window.innerHeight;
    const startY = -index * h;
    const endY = -targetIndex * h;

    return new Promise(resolve => {
      function frame(now){
        const p = Math.min(1, (now - start) / duration);
        const y = startY + (endY - startY) * easeInOutCubic(p);
        track.style.transform = `translate3d(0, ${y}px, 0)`;
        if (p < 1) requestAnimationFrame(frame);
        else {
          index = targetIndex;
          isAnimating = false;
          updateDots();
          // reveal
          const current = sections[index];
          if (current && current.classList.contains('reveal')) {
            current.classList.add('is-visible');
          }
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  function clampIndex(i){ return Math.max(0, Math.min(sections.length - 1, i)); }

  function go(delta){
    if (isAnimating) return;
    const now = performance.now();
    if (now - lastNavAt < NAV_COOLDOWN) return;
    const next = clampIndex(index + delta);
    if (next !== index){
      lastNavAt = now;
      tweenTo(next).then(()=>{ lastNavAt = performance.now(); });
    }
  }

  // DOTS
  function buildDots(){
    dotsNav.innerHTML = '';
    sections.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', `Go to slide ${i+1}`);
      btn.addEventListener('click', () => {
        if (isAnimating) return;
        tweenTo(i);
      });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
      });
      dotsNav.appendChild(btn);
    });
    updateDots();
  }
  function updateDots(){
    const btns = dotsNav.querySelectorAll('button');
    btns.forEach((b, i) => b.setAttribute('aria-current', i === index ? 'true' : 'false'));
  }

  // INPUT HANDLERS
  function onWheel(e){
    const now = performance.now();
    if (isAnimating || now - lastNavAt < NAV_COOLDOWN) return;
    wheelAccum += e.deltaY;
    if (Math.abs(wheelAccum) >= WHEEL_THRESHOLD){
      const dir = wheelAccum > 0 ? +1 : -1;
      wheelAccum = 0;
      go(dir);
    }
  }
  function onTouchStart(e){ if (e.touches && e.touches.length) startTouchY = e.touches[0].clientY; }
  function onTouchMove(e){
    if (startTouchY == null) return;
    if (isAnimating) { startTouchY = null; return; }
    const dy = startTouchY - e.touches[0].clientY;
    if (Math.abs(dy) > 50){
      const dir = dy > 0 ? +1 : -1;
      startTouchY = null;
      go(dir);
    }
  }
  function onTouchEnd(){ startTouchY = null; }
  function onKeyDown(e){
    const code = e.code;
    if (code === 'ArrowDown' || code === 'PageDown' || code === 'Space') { e.preventDefault(); go(+1); }
    else if (code === 'ArrowUp' || code === 'PageUp') { e.preventDefault(); go(-1); }
    else if (code === 'Home') { e.preventDefault(); tweenTo(0); }
    else if (code === 'End') { e.preventDefault(); tweenTo(sections.length - 1); }
  }

  // MENU OVERLAY (already wired in index.html controller)

  // INTRO
  function armBurgerCentered(){
    if (!burger) return;
    burger.setAttribute('data-active', '1');
    burger.removeAttribute('tabindex');
  }
  function expandBurgerToFull(){ if (burger) burger.classList.add('burger-bar--expanded'); }
  function unlockScroll(){ document.body.classList.remove('is-locked'); }

  async function runIntro(){
    layout();
    buildDots();
    sections[0].classList.add('is-visible');

    await sleep(240);
    await typewriter(sub, 'Based in St. Petersburg', { min: 80, max: 150, cursor: true });
    armBurgerCentered();
    await sleep(300);
    expandBurgerToFull();
    unlockScroll();

    const opts = { passive: true };
    // Attach to window to be robust (not only slides area)
    window.addEventListener('wheel', onWheel, opts);
    window.addEventListener('touchstart', onTouchStart, opts);
    window.addEventListener('touchmove', onTouchMove, opts);
    window.addEventListener('touchend', onTouchEnd, opts);
    window.addEventListener('keydown', onKeyDown);
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', runIntro); }
  else { runIntro(); }
})();