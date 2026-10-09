import { PoffWorld, bodyPath } from './poff-motion.mjs?v=1';

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
  const playground = createPlayground();

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
    playground.sync(paused() || document.hidden || dialog.open);
  }

  function createPlayground() {
    const demo = document.querySelector('.poff-demo');
    const stage = demo.querySelector('.demo-stage');
    const windowElement = demo.querySelector('.demo-window');
    const handle = demo.querySelector('.demo-window-handle');
    const shake = demo.querySelector('.demo-shake');
    const status = demo.querySelector('.demo-status');
    const poffs = [...demo.querySelectorAll('.demo-poff')];
    const bubbles = english ? { hello: 'Hello!', oops: 'Whoa!' } : { hello: '반가워요!', oops: '으악!' };
    const shookText = english ? 'Poff tumbles down, then finds its way back to the window.' : '포프가 떨어졌다가 다시 창 위로 돌아와요.';
    let scale, world, visible = false, stopped = true, frame, previousTime, drag, mouse, feedbackTimer;
    demo.hidden = false;

    function render() {
      windowElement.style.transform = `translate(${world.window.x * scale}px, ${world.window.y * scale}px)`;
      windowElement.style.width = `${world.window.width * scale}px`;
      windowElement.style.height = `${world.window.height * scale}px`;
      world.agents.forEach((agent, index) => {
        const element = poffs[index], pose = world.pose(agent);
        element.style.width = `${40 * scale}px`;
        element.style.height = `${42.5 * scale}px`;
        element.style.transform = `translate(${pose.x * scale}px, ${pose.y * scale}px)`;
        element.querySelector('svg').style.transform = `rotate(${pose.rotation}rad) scale(${pose.scaleX}, ${pose.scaleY})`;
        element.querySelector('.demo-body').setAttribute('d', bodyPath(agent.hem));
        element.querySelector('.demo-eyes').setAttribute('transform', `translate(${agent.eyeX / 1.25}, ${agent.eyeY / 1.25}) translate(16 15) scale(1 ${pose.blink ? .15 : 1}) translate(-16 -15)`);
        element.classList.toggle('is-happy', pose.happy);
        const bubble = element.querySelector('.demo-bubble');
        bubble.hidden = !agent.bubble;
        bubble.textContent = bubbles[agent.bubble] || '';
      });
      shake.disabled = stopped || !world.agents.some(agent => agent.seated);
    }

    function resize() {
      scale = stage.clientWidth < 600 ? 1.4 : 1.65;
      const width = stage.clientWidth / scale, height = stage.clientHeight / scale;
      if (world) world.resize(width, height);
      else world = new PoffWorld(width, height);
      endDrag();
      mouse = null;
      render();
    }

    function tick(at) {
      frame = null;
      if (stopped || !visible) return;
      if (previousTime !== undefined) world.update((at - previousTime) / 1000, mouse);
      previousTime = at;
      render();
      frame = requestAnimationFrame(tick);
    }

    function sync(pause = stopped) {
      stopped = pause;
      handle.disabled = stopped;
      if (stopped || !visible) {
        cancelAnimationFrame(frame);
        frame = null;
        previousTime = undefined;
        endDrag();
        windowElement.classList.remove('is-shaking');
      } else if (!frame) frame = requestAnimationFrame(tick);
      render();
    }

    function feedback(message) {
      clearTimeout(feedbackTimer);
      status.textContent = message;
      feedbackTimer = setTimeout(() => {
        status.textContent = '';
        world.agents.forEach(agent => { agent.bubble = ''; agent.waveUntil = 0; });
        render();
      }, 2300);
    }

    function endDrag() {
      if (drag && handle.hasPointerCapture(drag.id)) handle.releasePointerCapture(drag.id);
      drag = null;
      if (world) world.lastDrag = null;
    }

    resize();
    new ResizeObserver(resize).observe(stage);
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .05 }).observe(stage);
    stage.addEventListener('pointermove', event => {
      if (stopped) return;
      const rect = stage.getBoundingClientRect();
      const point = { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
      if (drag && event.pointerId === drag.id) {
        if (world.moveWindow(point.x - drag.x, point.y - drag.y, event.timeStamp / 1000)) feedback(shookText);
        render();
      } else if (event.pointerType === 'mouse') mouse = point;
    });
    stage.addEventListener('pointerleave', () => { mouse = null; });
    handle.addEventListener('pointerdown', event => {
      if (stopped || event.button !== 0) return;
      const rect = stage.getBoundingClientRect();
      drag = { id: event.pointerId, x: (event.clientX - rect.left) / scale - world.window.x, y: (event.clientY - rect.top) / scale - world.window.y };
      world.lastDrag = { ...world.window, at: event.timeStamp / 1000 };
      world.direction = { x: 0, y: 0 }; world.reversals = [];
      handle.setPointerCapture(event.pointerId);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(event => handle.addEventListener(event, endDrag));
    handle.addEventListener('keydown', event => {
      const directions = { ArrowLeft: [-18, 0], ArrowRight: [18, 0], ArrowUp: [0, -18], ArrowDown: [0, 18] };
      const direction = directions[event.key];
      if (!direction || stopped) return;
      event.preventDefault();
      if (world.moveWindow(world.window.x + direction[0], world.window.y + direction[1], event.timeStamp / 1000)) feedback(shookText);
      render();
    });
    poffs.forEach((element, index) => {
      element.addEventListener('click', () => { world.greet(index); feedback(text.greeting); render(); });
      ['pointerenter', 'focusin'].forEach(event => element.addEventListener(event, () => { world.pausedIndex = index; }));
      ['pointerleave', 'focusout'].forEach(event => element.addEventListener(event, () => {
        if (world.pausedIndex === index && document.activeElement !== element && !element.matches(':hover')) world.pausedIndex = undefined;
      }));
    });
    shake.addEventListener('click', () => {
      if (stopped || !world.shake()) return;
      windowElement.classList.remove('is-shaking');
      // Restart the short window shake when the previous one has already finished.
      void windowElement.offsetWidth;
      windowElement.classList.add('is-shaking');
      feedback(shookText);
      render();
    });
    windowElement.addEventListener('animationend', () => windowElement.classList.remove('is-shaking'));
    return { sync };
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
