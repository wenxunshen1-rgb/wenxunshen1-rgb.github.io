(() => {
  "use strict";
  const hero = document.querySelector(".hero");
  const heading = document.querySelector("#hero-title");
  const portrait = document.querySelector(".hero-portrait");
  const magnet = document.querySelector(".portrait-magnet");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");
  const gazeRange = [14, 9].map((fallback, index) => {
    const value = window.PORTFOLIO_CONTENT?.profile?.heroGaze?.maxOffset?.[index];
    return Number.isFinite(value) ? Math.max(0, Math.min(20, value)) : fallback;
  });
  let frame = 0;
  let previousFrame = 0;
  let touchPointer = null;
  const target = { x: 0, y: 0, yaw: 0, pitch: 0, roll: 0, eyeX: 0, eyeY: 0 };
  const current = { ...target };

  function fitHeading() {
    heading.style.fontSize = "";
    const available = heading.parentElement.clientWidth;
    const preferredSize = parseFloat(getComputedStyle(heading).fontSize);
    const natural = heading.scrollWidth;
    // Fit the font itself so glyphs and their spacing keep their proportions.
    if (natural > available && available > 1) {
      heading.style.fontSize = `${Math.floor(preferredSize * (available - 1) / natural * 100) / 100}px`;
    }
  }
  const resize = new ResizeObserver(fitHeading);
  resize.observe(heading.parentElement);
  document.fonts.ready.then(fitHeading);

  function writePose() {
    if (!magnet) return;
    magnet.style.setProperty("--magnet-x", `${current.x.toFixed(2)}px`);
    magnet.style.setProperty("--magnet-y", `${current.y.toFixed(2)}px`);
    magnet.style.setProperty("--look-yaw", `${current.yaw.toFixed(2)}deg`);
    magnet.style.setProperty("--look-pitch", `${current.pitch.toFixed(2)}deg`);
    magnet.style.setProperty("--look-roll", `${current.roll.toFixed(2)}deg`);
    window.SeanAvatarGaze?.update(current.eyeX, current.eyeY);
  }
  function commitPointer(now) {
    const elapsed = previousFrame ? Math.min(64, now - previousFrame) : 16.67;
    previousFrame = now;
    let moving = false;
    for (const key of Object.keys(target)) {
      const follow = 1 - Math.exp(-elapsed / (key.startsWith("eye") ? 35 : 85));
      current[key] += (target[key] - current[key]) * follow;
      if (Math.abs(target[key] - current[key]) > .015) moving = true;
      else current[key] = target[key];
    }
    writePose();
    frame = moving ? requestAnimationFrame(commitPointer) : 0;
    if (!moving) previousFrame = 0;
  }
  function schedulePointer() { if (!frame) frame = requestAnimationFrame(commitPointer); }
  function resetPointer() {
    touchPointer = null;
    for (const key of Object.keys(target)) target[key] = 0;
    if (reduced.matches || document.hidden) {
      cancelAnimationFrame(frame);frame = previousFrame = 0;
      Object.assign(current, target);writePose();
    } else schedulePointer();
  }
  function pointAt(event) {
    if (!portrait || !magnet || reduced.matches || !["complete", "settling"].includes(hero.dataset.introState)) return;
    if (event.pointerType === "touch" ? touchPointer !== event.pointerId : !finePointer.matches) return;
    const bounds = portrait.getBoundingClientRect();
    const clamp = value => Math.max(-1, Math.min(1, value));
    const x = clamp((event.clientX - bounds.x - bounds.width / 2) / (bounds.width / 2));
    const y = clamp((event.clientY - bounds.y - bounds.height / 2) / (bounds.height / 2));
    const touch = event.pointerType === "touch";
    target.x = x * (touch ? 12 : 28);target.y = y * (touch ? 10 : 18);
    target.yaw = x * (touch ? 14 : 18);target.pitch = -y * (touch ? 10 : 12);
    target.roll = x * 1.2;
    target.eyeX = x * gazeRange[0];target.eyeY = y * gazeRange[1];
    schedulePointer();
  }
  hero.addEventListener("pointermove", pointAt, { passive: true });
  hero.addEventListener("pointerdown", event => {
    if (event.pointerType !== "touch" || event.target.closest("a,button")) return;
    touchPointer = event.pointerId;pointAt(event);
  }, { passive: true });
  hero.addEventListener("pointerup", event => { if (event.pointerId === touchPointer) resetPointer(); });
  hero.addEventListener("pointercancel", resetPointer);
  hero.addEventListener("pointerleave", resetPointer);
  reduced.addEventListener("change", resetPointer);
  finePointer.addEventListener("change", resetPointer);
  document.addEventListener("visibilitychange", () => { if (document.hidden) resetPointer(); });
  new MutationObserver(() => { if (!["complete", "settling"].includes(hero.dataset.introState)) resetPointer(); }).observe(hero, { attributes: true, attributeFilter: ["data-intro-state"] });

  let touchedCard = null;
  function releaseCard() {
    if (touchedCard) delete touchedCard.dataset.touchActive;
    touchedCard = null;
  }
  document.addEventListener("pointerdown", event => {
    if (event.pointerType !== "touch") return;
    releaseCard();
    touchedCard = event.target.closest(".reel-card,.project-card,.filter,.button-gradient,.contact-method:not(:disabled)");
    if (touchedCard) touchedCard.dataset.touchActive = "true";
  }, { passive: true });
  document.addEventListener("pointerup", releaseCard, { passive: true });
  document.addEventListener("pointercancel", releaseCard, { passive: true });

  // CSS scroll timelines reveal this existing introduction without a scroll listener.
  const biography = document.querySelector(".about-description");
  const text = biography.textContent;
  const accessible = document.createElement("span");
  accessible.className = "sr-only";
  accessible.textContent = text;
  const fragment = document.createDocumentFragment();
  fragment.append(accessible);
  [...text].forEach((character, index, all) => {
    const span = document.createElement("span");
    span.className = "reveal-character";
    span.setAttribute("aria-hidden", "true");
    span.textContent = character;
    span.style.setProperty("--letter-start", `${(index / all.length * 75).toFixed(2)}%`);
    span.style.setProperty("--letter-end", `${(index / all.length * 75 + 25).toFixed(2)}%`);
    fragment.append(span);
  });
  biography.replaceChildren(fragment);

  window.addEventListener("pagehide", () => {
    resize.disconnect();
    resetPointer();
    releaseCard();
    if (frame) cancelAnimationFrame(frame);
    frame = previousFrame = 0;
    Object.assign(current, target);writePose();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) resize.observe(heading.parentElement);
  });
})();
