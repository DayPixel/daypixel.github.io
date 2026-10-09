(() => {
  const root = document.documentElement;
  const english = root.lang === 'en';
  const text = english ? {
    reducedLabel: 'Motion reduced by your device settings', reduced: 'Reduced motion',
    resume: 'Resume motion', pause: 'Pause motion', greeting: 'Poff says hello back!'
  } : {
    reducedLabel: '기기 설정에 따라 움직임 줄임', reduced: '움직임 줄임',
    resume: '움직임 켜기', pause: '움직임 멈추기', greeting: '포프도 반갑게 인사해요!'
  };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.motion-toggle');
  const hero = document.querySelector('.hero');
  const preview = document.querySelector('.night-preview');
  const greeting = document.querySelector('.puff-greeting');
  const friend = document.querySelector('.friend-mint');
  const dialog = document.querySelector('.film-dialog');
  const film = document.querySelector('.full-film');
  const filmLinks = document.querySelectorAll('.film-link, .film-stage');
  let filmTrigger = filmLinks[0];
  const animations = new Set();
  let userPaused = false;
  let previewVisible = false;
  let greetingTimer;
  let pointerFrame;
  const paused = () => userPaused || reducedMotion.matches;

  function syncMotion() {
    root.classList.toggle('motion-paused', paused() || document.hidden || dialog.open);
    toggle.setAttribute('aria-pressed', String(paused()));
    toggle.setAttribute('aria-label', reducedMotion.matches ? text.reducedLabel : paused() ? text.resume : text.pause);
    toggle.querySelector('span').textContent = reducedMotion.matches ? text.reduced : paused() ? text.resume : text.pause;
    toggle.querySelector('use').setAttribute('href', paused() ? '#play' : '#pause');
    toggle.disabled = reducedMotion.matches;
    if (paused() || document.hidden || dialog.open) {
      animations.forEach(animation => animation.cancel());
      hero.style.removeProperty('--eye-x');
      hero.style.removeProperty('--eye-y');
    }
    if (!paused() && previewVisible && !document.hidden && !dialog.open) {
      // Autoplay may be denied; the poster and full-film link remain usable.
      preview.play().catch(() => {});
    } else {
      preview.pause();
    }
  }

  function animate(element, frames, options) {
    if (paused()) return;
    const animation = element.animate(frames, options);
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  }

  toggle.hidden = false;
  toggle.addEventListener('click', () => { userPaused = !userPaused; syncMotion(); });
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) film.pause();
    syncMotion();
  });
  root.classList.add('motion-ready');
  syncMotion();

  const visibility = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.target === preview) previewVisible = entry.isIntersecting;
      else entry.target.classList.toggle('is-visible', entry.isIntersecting);
    });
    syncMotion();
  }, { threshold: 0.05 });
  visibility.observe(preview);
  visibility.observe(hero);

  const reveals = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animate(entry.target, [{ opacity: 0.25, transform: 'translateY(28px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 850, easing: 'cubic-bezier(.22,1,.36,1)' });
      reveals.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('[data-reveal]').forEach(element => reveals.observe(element));
  animate(document.querySelector('.hero-copy'), [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 950, easing: 'cubic-bezier(.22,1,.36,1)' });

  hero.addEventListener('pointermove', event => {
    if (paused() || event.pointerType !== 'mouse' || pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = null;
      if (paused()) return;
      const rect = hero.getBoundingClientRect();
      hero.style.setProperty('--eye-x', `${((event.clientX - rect.left) / rect.width - 0.5) * 3}px`);
      hero.style.setProperty('--eye-y', `${((event.clientY - rect.top) / rect.height - 0.5) * 2}px`);
    });
  });
  hero.addEventListener('pointerleave', () => {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = null;
    hero.style.removeProperty('--eye-x');
    hero.style.removeProperty('--eye-y');
  });
  greeting.disabled = false;
  document.querySelector('.friend-hint').hidden = false;
  greeting.addEventListener('click', () => {
    clearTimeout(greetingTimer);
    friend.classList.add('is-greeting');
    document.querySelector('.greeting-status').textContent = text.greeting;
    animate(greeting, [{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg) translateY(-8px)', offset: .2 }, { transform: 'rotate(12deg)', offset: .4 }, { transform: 'rotate(-10deg)', offset: .6 }, { transform: 'rotate(6deg)', offset: .8 }, { transform: 'rotate(0)' }], { duration: 850, easing: 'ease-in-out' });
    greetingTimer = setTimeout(() => {
      friend.classList.remove('is-greeting');
      document.querySelector('.greeting-status').textContent = '';
    }, 2300);
  });

  filmLinks.forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    filmTrigger = link;
    dialog.showModal();
    syncMotion();
    film.play().catch(() => {});
  }));
  document.querySelector('.film-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { film.pause(); syncMotion(); filmTrigger.focus({ preventScroll: true }); });
})();
