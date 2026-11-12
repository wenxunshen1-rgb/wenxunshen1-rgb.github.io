(() => {
  "use strict";
  const stage = document.querySelector("#hero-still");
  const portrait = stage?.querySelector(".hero-still-image");
  const tools = stage?.querySelector(".hero-tools");
  if (!stage || !portrait || !tools) return;
  const trails = document.createElement("div");
  trails.className = "hero-tool-trails";
  trails.setAttribute("aria-hidden", "true");
  for (const tool of tools.querySelectorAll(".hero-tool")) {
    const source = tool.querySelector("img");
    if (!source) continue;
    const trail = tool.cloneNode(false);
    for (const depth of ["far", "near"]) {
      const image = source.cloneNode(false);
      image.classList.add("hero-tool-trail", `trail-${depth}`);
      trail.append(image);
    }
    trails.append(trail);
  }
  stage.insertBefore(trails, portrait);
  let frame = 0;
  // object-fit:contain can leave space on either axis. Anchor the fan to the visible artwork.
  function fit() {
    frame = 0;
    const ratio = (portrait.naturalWidth || 1672) / (portrait.naturalHeight || 941);
    const width = Math.min(stage.clientWidth, stage.clientHeight * ratio);
    const height = width / ratio;
    stage.style.setProperty("--tools-width", `${width}px`);
    stage.style.setProperty("--tools-height", `${height}px`);
    stage.style.setProperty("--scene-screen-left", `${stage.getBoundingClientRect().left + (stage.clientWidth - width) / 2}px`);
    tools.dataset.ready = "true";
    trails.dataset.ready = "true";
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(fit); }
  const observer = new ResizeObserver(schedule);
  observer.observe(stage);
  portrait.addEventListener("load", schedule);
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("pagehide", () => { observer.disconnect(); cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener("pageshow", () => { observer.observe(stage); schedule(); });
  document.fonts.ready.then(schedule);
  schedule();
})();
