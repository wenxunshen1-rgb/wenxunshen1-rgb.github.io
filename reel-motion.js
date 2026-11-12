(() => {
  "use strict";
  const section = document.querySelector(".portfolio-reel");
  const rows = [...document.querySelectorAll(".portfolio-reel .marquee-row")];
  if (!section || !rows.length || !Element.prototype.animate) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const states = rows.map((row, index) => ({ row, index, animation: null, stride: 0, span: 0, duration: 0, from: 0, to: 0 }));
  let visible = false, hovered = false, pointer = null, resizeFrame = 0;

  const modulo = (value, period) => ((value % period) + period) % period;
  function paused() { return reduced.matches || document.hidden || !visible || hovered || pointer !== null; }
  function freeze(state) {
    const animation = state.animation;
    if (!animation) return;
    const time = animation.currentTime;
    animation.pause();
    // Hold immediately, including a pause requested between compositor frames.
    if (Number.isFinite(time)) animation.currentTime = time;
  }
  function sync() {
    const hold = paused();
    section.dataset.reelPaused = String(hold);
    for (const state of states) {
      if (!state.animation) continue;
      if (hold) freeze(state);
      else if (state.animation.playState !== "running") state.animation.play();
    }
  }
  function rebuild() {
    resizeFrame = 0;
    for (const state of states) {
      const { row } = state, first = row.querySelector(".reel-card");
      const count = Number(row.dataset.unitCount);
      if (!first || !count) continue;
      const firstRect = first.getBoundingClientRect(), nextUnit = row.children[count];
      const gap = parseFloat(getComputedStyle(row).columnGap || 0);
      const span = nextUnit ? nextUnit.getBoundingClientRect().left - firstRect.left : [...row.children].slice(0, count).reduce((sum, card) => sum + card.getBoundingClientRect().width + gap, 0);
      const focus = row.children[count + Math.min(1, count - 1)] || first;
      const focusRect = focus.getBoundingClientRect();
      const anchor = focusRect.left - firstRect.left + focusRect.width / 2;
      row.style.setProperty("--reel-anchor-px", `${anchor}px`);
      if (state.animation && Math.abs(span - state.span) < .01) continue;
      // Keep the same artwork and fractional card offset through responsive changes.
      const progress = state.animation && state.duration ? modulo(Number(state.animation.currentTime) || 0, state.duration) / state.duration : .5;
      state.animation?.cancel();
      const speed = state.index % 2 ? 26 : 28;
      Object.assign(state, { span, duration: span / speed * 1000, from: span / 2 * (state.index % 2 ? -1 : 1), to: span / 2 * (state.index % 2 ? 1 : -1) });
      state.animation = row.animate([
        { transform: `translateX(${state.from}px)` },
        { transform: `translateX(${state.to}px)` },
      ], { duration: state.duration, iterations: Infinity, easing: "linear", fill: "both", id: `sean-reel-${state.index}` });
      state.animation.pause();
      state.animation.currentTime = progress * state.duration;
      row.dataset.unitSpan = span.toFixed(3);
      row.dataset.reelSpeed = String(speed);
    }
    sync();
  }
  function requestResize() {
    if (!resizeFrame) resizeFrame = requestAnimationFrame(rebuild);
  }

  section.addEventListener("pointerenter", event => {
    if (event.pointerType === "touch") return;
    hovered = true;
    sync();
  });
  section.addEventListener("pointerleave", event => {
    if (event.pointerType === "touch") return;
    hovered = false;
    sync();
  });
  section.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" || !event.isPrimary || pointer) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false, times: states.map(state => Number(state.animation?.currentTime) || 0) };
    sync();
  });
  section.addEventListener("pointermove", event => {
    if (!pointer || event.pointerId !== pointer.id || reduced.matches) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (!pointer.dragging) {
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
      pointer.dragging = true;
      section.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    states.forEach((state, index) => {
      if (!state.animation) return;
      state.animation.currentTime = modulo(pointer.times[index] + dx / (state.to - state.from) * state.duration, state.duration);
    });
  }, { passive: false });
  function releasePointer(event) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const id = pointer.id;
    pointer = null;
    if (section.hasPointerCapture(id)) section.releasePointerCapture(id);
    sync();
  }
  window.addEventListener("pointerup", releasePointer);
  window.addEventListener("pointercancel", releasePointer);
  section.addEventListener("lostpointercapture", releasePointer);
  section.addEventListener("dragstart", event => event.preventDefault());
  document.addEventListener("visibilitychange", sync);
  reduced.addEventListener("change", sync);
  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    sync();
  }, { threshold: 0 });
  intersection.observe(section);
  const resize = new ResizeObserver(requestResize);
  resize.observe(section);
  const rowChanges = new MutationObserver(requestResize);
  rows.forEach(row => {
    resize.observe(row);
    if (row.firstElementChild) resize.observe(row.firstElementChild);
    rowChanges.observe(row, { childList: true, attributes: true, attributeFilter: ["data-unit-count"] });
  });
  window.addEventListener("pagehide", () => {
    visible = false;hovered = false;pointer = null;
    sync();
  });
  window.addEventListener("pageshow", () => {
    const bounds = section.getBoundingClientRect();
    // Match IntersectionObserver's threshold-0 edge contact. A stricter test
    // can overwrite its initial true result and leave the reel paused forever.
    visible = bounds.bottom >= 0 && bounds.top <= innerHeight;
    sync();
  });
  rebuild();
})();
