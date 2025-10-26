// Clean, robust build: intro + burger + track slides + dots + iOS-friendly sizes
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
  const NAV_COOLDOWN = 380; // < 500ms

  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

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

  function vpHeight(){
    return (window.visualViewport && Math.round(window.visualViewport.height)) || document.documentElement.clientHeight;
  }

  function layout(){
    const h = vpHeight();
    track.style.height = `${sections.length * h}px`;
    sections.forEach((sec, i) => {
      sec.style.position = 'absolute';
      sec.style.top = `${i * h}px`;
      sec.style.left = '0';
      sec.style.right = '0';
    });
    track.style.transform = `translate3d(0, ${-index * h}px, 0)`;
  }

  let resizeRAF = null;
  function onResize(){
    if (isAnimating) return;
    if (resizeRAF) cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(layout);
  }

  function easeInOutCubic(t){ return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2; }
  function clampIndex(i){ return Math.max(0, Math.min(sections.length - 1, i)); }

  function tweenTo(targetIndex, duration=500){
    if (isAnimating) return Promise.resolve();
    isAnimating = true;
    const start = performance.now();
    const h = vpHeight();
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
          const current = sections[index];
          if (current && current.classList.contains('reveal')) current.classList.add('is-visible');
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  function go(delta){
    const now = performance.now();
    if (isAnimating || now - lastNavAt < NAV_COOLDOWN) return;
    const next = clampIndex(index + delta);
    if (next !== index){ lastNavAt = now; tweenTo(next).then(()=>{ lastNavAt = performance.now(); }); }
  }

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
    if (startTouchY == null || isAnimating) return;
    const dy = startTouchY - e.touches[0].clientY;
    if (Math.abs(dy) > 50){ startTouchY = null; go(dy > 0 ? +1 : -1); }
  }
  function onTouchEnd(){ startTouchY = null; }
  function onKeyDown(e){
    const code = e.code;
    if (code === 'ArrowDown' || code === 'PageDown' || code === 'Space') { e.preventDefault(); go(+1); }
    else if (code === 'ArrowUp' || code === 'PageUp') { e.preventDefault(); go(-1); }
    else if (code === 'Home') { e.preventDefault(); tweenTo(0); }
    else if (code === 'End') { e.preventDefault(); tweenTo(sections.length - 1); }
  }

  function buildDots(){
    dotsNav.innerHTML = '';
    sections.forEach((_, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', `Go to slide ${i+1}`);
      btn.addEventListener('click', () => { if (!isAnimating) tweenTo(i); });
      btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); } });
      dotsNav.appendChild(btn);
    });
    updateDots();
  }
  function updateDots(){
    const btns = dotsNav.querySelectorAll('button');
    btns.forEach((b, i) => b.setAttribute('aria-current', i === index ? 'true' : 'false'));
  }

  function armBurger(){
    if (!burger) return;
    burger.setAttribute('data-active', '1');
    burger.removeAttribute('tabindex');
    document.body.classList.add('burger-animate');
  }
  function unlockScroll(){ document.body.classList.remove('is-locked'); }

  async function run(){
    layout();
    buildDots();
    sections[0].classList.add('is-visible');

    await sleep(240);
    await typewriter(sub, 'Based in St. Petersburg', { min: 80, max: 150, cursor: true });
    armBurger();
    unlockScroll();

    const opts = { passive: true };
    window.addEventListener('resize', onResize);
    window.addEventListener('wheel', onWheel, opts);
    window.addEventListener('touchstart', onTouchStart, opts);
    window.addEventListener('touchmove', onTouchMove, opts);
    window.addEventListener('touchend', onTouchEnd, opts);
    window.addEventListener('keydown', onKeyDown);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();