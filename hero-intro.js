(() => {
  "use strict";
  const hero = document.querySelector(".hero");
  const video = document.querySelector("#hero-film");
  const skip = document.querySelector("#intro-skip");
  const replay = document.querySelector("#intro-replay");
  const status = document.querySelector("#intro-status");
  if (!hero || !video) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const navigation = hero.querySelector(".main-nav");
  const utilities = hero.querySelector(".hero-utilities");
  let layoutFrame = 0;
  function fitFilmToSafeArea() {
    const area = hero.getBoundingClientRect();
    const nav = navigation.getBoundingClientRect();
    const controls = utilities.getBoundingClientRect();
    const ratio = video.videoWidth && video.videoHeight ? video.videoHeight / video.videoWidth : 9 / 16;
    const properties = {
      "--intro-safe-top": `${Math.max(0, Math.ceil(nav.bottom - area.top)) + 20}px`,
      "--intro-safe-bottom": `${Math.max(0, Math.ceil(area.bottom - controls.top)) + 16}px`,
      "--intro-film-height": `${area.width * ratio}px`,
    };
    for (const [name, value] of Object.entries(properties)) {
      if (hero.style.getPropertyValue(name) !== value) hero.style.setProperty(name, value);
    }
  }
  function requestFilmFit() {
    if (layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => { layoutFrame = 0; fitFilmToSafeArea(); });
  }
  const layoutObserver = new ResizeObserver(requestFilmFit);
  for (const element of [hero, navigation, utilities]) layoutObserver.observe(element);
  fitFilmToSafeArea();
  video.addEventListener("loadedmetadata", requestFilmFit);
  document.fonts.ready.then(requestFilmFit);
  let attempt = 0;
  let loadingTimer;
  function finish(message = "开场动画结束") {
    attempt += 1;
    clearTimeout(loadingTimer);
    video.pause();
    hero.dataset.introState = "complete";
    document.body.dataset.heroTone = "dark";
    skip.hidden = true;
    replay.hidden = false;
    requestFilmFit();
    status.textContent = message;
    if (document.activeElement === skip) replay.focus({ preventScroll: true });
  }
  async function play(manual = false) {
    if (!manual && window.matchMedia("(max-width: 767px)").matches) {
      finish("已显示首页，可选择播放开场");
      replay.firstChild.textContent = "播放开场 ";
      return;
    }
    if (reducedMotion.matches && !manual) {
      finish("已显示静止首屏，可选择重播开场");
      return;
    }
    const currentAttempt = ++attempt;
    clearTimeout(loadingTimer);
    hero.dataset.introState = "loading";
    document.body.dataset.heroTone = "dark";
    skip.hidden = false;
    replay.hidden = true;
    requestFilmFit();
    const source = video.querySelector('source');
    if (!source.getAttribute('src')) {
      source.src = source.dataset.src;
      video.poster = video.dataset.poster;
      video.load();
    }
    video.muted = true;
    video.loop = false;
    if (video.readyState > 0) video.currentTime = 0;
    status.textContent = "正在播放 15 秒开场动画，可跳过";
    loadingTimer = setTimeout(() => {
      if (hero.dataset.introState === "loading") finish("已显示首屏，可选择重播开场");
    }, 5000);
    try {
      await video.play();
      if (currentAttempt !== attempt) return;
      clearTimeout(loadingTimer);
      hero.dataset.introState = "playing";
    } catch {
      if (currentAttempt === attempt) finish("已显示静止首屏，可选择重播开场");
    }
  }
  video.addEventListener("timeupdate", () => {
    if (!["playing", "settling"].includes(hero.dataset.introState)) return;
    const time = video.currentTime;
    document.body.dataset.heroTone = "dark";
    if (time >= 14.15 && hero.dataset.introState === "playing") hero.dataset.introState = "settling";
  });
  video.addEventListener("ended", () => finish());
  video.addEventListener("error", () => finish("已显示静止首屏"));
  skip.addEventListener("click", () => finish("已跳过开场动画"));
  replay.addEventListener("click", () => play(true));
  reducedMotion.addEventListener("change", () => { if (reducedMotion.matches) finish("已显示静止首屏"); });
  window.addEventListener("pagehide", () => { clearTimeout(loadingTimer);cancelAnimationFrame(layoutFrame);layoutFrame = 0;video.pause();layoutObserver.disconnect(); });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      for (const element of [hero, navigation, utilities]) layoutObserver.observe(element);
      requestFilmFit();finish();
    }
  });
  // Keep the hero visible immediately. The intro video is optional, and only downloads on request.
  finish("首页已显示，可选择播放开场");
  replay.firstChild.textContent = "播放开场 ";
})();
