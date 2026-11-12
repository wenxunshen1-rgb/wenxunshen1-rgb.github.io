(() => {
  "use strict";
  const audio = document.querySelector("#background-music");
  const button = document.querySelector("#music-toggle");
  const status = document.querySelector("#music-status");
  if (!audio || !button) return;
  let enabled = false;
  let busy = false;
  let pausedForBackground = false;
  audio.volume = .38;
  function update() {
    const playing = !audio.paused && !audio.ended && !audio.error && audio.readyState >= 2;
    button.setAttribute("aria-pressed", String(playing));
    const label = playing ? "关闭背景音乐" : "开启背景音乐";
    button.setAttribute("aria-label", label);
    button.title = label;
  }
  function remember(value) {
    try { localStorage.setItem("portfolio-music-enabled", String(value)); } catch { /* Optional preference. */ }
  }
  async function start(announce = true) {
    let timeout;
    try {
      if (audio.error) audio.load();
      await Promise.race([
        audio.play(),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Music load timed out")), 8000); }),
      ]);
      enabled = true;
      remember(true);
      if (announce) status.textContent = "背景音乐已开启";
    } catch {
      enabled = false;
      audio.pause();
      if (announce) status.textContent = "音乐暂未播放，请再次点击开启";
    } finally { clearTimeout(timeout); }
    update();
  }
  button.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    try {
      if (!audio.paused) {
        enabled = false;
        pausedForBackground = false;
        audio.pause();
        remember(false);
        status.textContent = "背景音乐已关闭";
      } else await start();
    } finally { busy = false;update(); }
  });
  audio.addEventListener("play", update);
  audio.addEventListener("playing", update);
  audio.addEventListener("pause", update);
  audio.addEventListener("error", () => {
    enabled = false;
    audio.pause();
    status.textContent = "音乐暂时无法加载，可稍后重试";
    update();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pausedForBackground = enabled && !audio.paused;
      audio.pause();
    } else if (pausedForBackground && enabled) {
      pausedForBackground = false;
      start(false);
    }
  });
  window.addEventListener("pagehide", () => audio.pause());
  update();
  try {
    if (localStorage.getItem("portfolio-music-enabled") === "true") start(false);
  } catch { /* Start remains available through the music button. */ }
})();
