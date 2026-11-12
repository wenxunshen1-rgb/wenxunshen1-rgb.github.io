(() => {
  "use strict";
  const content = window.PORTFOLIO_CONTENT;
  if (!content) return;
  const { profile, categories, projects: sourceProjects } = content;
  // Category grouping is fixed; order remains stable when cases are added or removed.
  const categoryOrder = new Map(["events", "spaces", "branding"].map((id, index) => [id, index]));
  const caseOrder = project => Number.isFinite(project.order) ? project.order : Number(project.id?.match(/\d+$/)?.[0] ?? Number.MAX_SAFE_INTEGER);
  const categoryCounts = new Map();
  const projects = [...sourceProjects].sort((a, b) =>
    (categoryOrder.get(a.category) ?? 3) - (categoryOrder.get(b.category) ?? 3) ||
    caseOrder(a) - caseOrder(b)
  ).map(project => {
    const number = (categoryCounts.get(project.category) ?? 0) + 1;
    categoryCounts.set(project.category, number);
    return {
      ...project,
      gallery: window.SEAN_GALLERY_NUMBERING(project.gallery ?? []),
      displayNumber: number,
      title: project.placeholder ? project.title.replace(/\d+$/, String(number).padStart(2, "0")) : project.title,
    };
  });
  const grid = document.querySelector("#project-grid");
  const dialog = document.querySelector("#project-dialog");
  const categoryFor = (id) => categories.find((category) => category.id === id);
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  let toastTimer;
  function toast(message) {
    const element = document.querySelector("#toast");
    clearTimeout(toastTimer);
    element.textContent = message;
    element.classList.add("visible");
    toastTimer = setTimeout(() => element.classList.remove("visible"), 3500);
  }

  // All editable content is inserted as text, never interpreted as HTML.
  document.querySelectorAll("[data-profile]").forEach((element) => {
    const text = profile[element.dataset.profile];
    if (typeof text === "string") element.textContent = text;
  });
  document.querySelector(".wordmark").setAttribute("aria-label", `${profile.wordmark} · 个人作品集首页`);
  if (profile.name && profile.name.trim()) {
    document.title = `${profile.name} · 个人作品集`;
  }
  const experienceList = document.querySelector("#about-experience");
  if (experienceList && Array.isArray(profile.experience)) {
    const rows = document.createDocumentFragment();
    profile.experience.forEach((experience) => {
      const row = make("li", "experience-row");
      row.append(make("span", "experience-period", experience.period));
      const details = make("div", "experience-details");
      details.append(make("strong", "experience-company", experience.company));
      const position = make("p", "experience-position");
      position.append(make("span", "experience-role", experience.role));
      const separator = make("span", "experience-divider", "丨");
      separator.setAttribute("aria-hidden", "true");
      position.append(separator, make("span", "experience-department", experience.department));
      details.append(position);
      row.append(details);
      rows.append(row);
    });
    experienceList.replaceChildren(rows);
  }

  const visualMarkup = {
    event: '<span class="cover-word">MAKE<br>IT HAPPEN.</span><div class="event-stair"><i style="--step:0"></i><i style="--step:1"></i><i style="--step:2"></i></div>',
    space: '<div class="space-grid"></div><span class="cover-word">A SPACE<br>TO FEEL.</span><div class="space-door"></div>',
    brand: '<span class="cover-word">Aa.</span><div class="brand-sheet"><span>B.</span></div>',
    experience: '<span class="cover-word">LIVE<br>THE IDEA.</span><div class="experience-orbit"></div>',
    atmosphere: '<span class="cover-word">BE<br>IN THE<br>MOMENT.</span><div class="atmosphere-panels"><i style="--step:0"></i><i style="--step:1"></i><i style="--step:2"></i></div>',
    identity: '<span class="cover-word">BE<br>YOURSELF.</span><div class="identity-card">b.</div>',
  };
  const glowPalette = {
    event: "#9b68b7", experience: "#3e79a7", space: "#627e90",
    brand: "#a8834f", atmosphere: "#aaa4bf", identity: "#b7617f",
  };
  function applyCardGlow(card, project, hasImage = Boolean(safeImage(project.image))) {
    if (!card) return;
    const custom = typeof project.glowColor === "string" && /^#[\da-f]{6}$/i.test(project.glowColor) ? project.glowColor : null;
    const key = Object.hasOwn(visualMarkup, project.visual) ? project.visual : "event";
    card.dataset.glowPreset = !custom && !hasImage ? key : "custom";
    card.style.setProperty("--edge-accent", custom || (hasImage ? "#b8c4cc" : glowPalette[key]));
  }
  function abstractCover(project) {
    const key = Object.hasOwn(visualMarkup, project.visual) ? project.visual : "event";
    const cover = make("div", `cover-art cover-${key}`);
    cover.setAttribute("aria-hidden", "true");
    // This markup is a fixed internal illustration, not editable content.
    cover.innerHTML = visualMarkup[key];
    cover.append(make("span", "cover-caption", categoryFor(project.category)?.english ?? "PROJECT"));
    return cover;
  }
  function safeImage(source) {
    if (typeof source !== "string" || !source.trim()) return null;
    try {
      const url = new URL(source, document.baseURI);
      return ["https:", "http:", "file:"].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }
  function addCover(container, project, lazy = true) {
    const cardSource = lazy && project.cardImage;
    const imageSource = safeImage(cardSource || project.image);
    if (!imageSource) {
      container.append(abstractCover(project));
      return;
    }
    const image = make("img");
    image.src = imageSource;
    image.alt = project.title;
    const displaySize = cardSource ? project.cardImageSize : project.imageSize;
    if (displaySize?.every(value => Number.isFinite(value) && value > 0)) {
      [image.width, image.height] = displaySize;
    }
    image.loading = lazy ? "lazy" : "eager";
    image.decoding = "async";
    image.addEventListener("error", () => {
      image.remove();
      container.append(abstractCover(project));
      applyCardGlow(container.closest(".reel-card,.project-card"), project, false);
      const label = make("span", "image-error", "图片暂时无法加载");
      container.append(label);
    }, { once: true });
    container.append(image);
  }
  const avatar = document.querySelector(".hero-portrait img");
  const avatarSource = safeImage(profile.heroAvatar);
  if (avatar && avatarSource) {
    const fallback = avatar.src;
    avatar.addEventListener("error", () => { if (avatar.src !== fallback) avatar.src = fallback; }, { once: true });
    avatar.src = avatarSource;
  }
  if (safeImage(profile.portrait)) {
    const portrait = document.querySelector(".about-portrait");
    const image = make("img");
    image.src = safeImage(profile.portrait);
    image.alt = `${profile.name}的个人照片`;
    image.loading = "eager";
    image.decoding = "async";
    const framing = profile.portraitFraming;
    if (framing && [framing.x, framing.y, framing.zoom].every(Number.isFinite)) {
      portrait.style.setProperty("--portrait-x", `${Math.max(0, Math.min(100, framing.x))}%`);
      portrait.style.setProperty("--portrait-y", `${Math.max(0, Math.min(100, framing.y))}%`);
      portrait.style.setProperty("--portrait-zoom", Math.max(1.4, Math.min(4, framing.zoom)));
    }
    image.addEventListener("load", () => {
      portrait.replaceChildren(image);
      portrait.setAttribute("aria-label", `查看${profile.name}的个人照片大图`);
      portrait.dataset.hasPhoto = "true";
      portrait.disabled = false;
    }, { once: true });
    const photoDialog = document.querySelector("#portrait-dialog");
    const fullPhoto = photoDialog.querySelector("img");
    portrait.addEventListener("click", () => {
      fullPhoto.src = image.src;
      fullPhoto.alt = image.alt;
      photoDialog.showModal();
      document.body.classList.add("dialog-open");
    });
    photoDialog.querySelector(".portrait-dialog-close").addEventListener("click", () => photoDialog.close());
    photoDialog.addEventListener("close", () => {
      if (!document.querySelector("dialog[open]")) document.body.classList.remove("dialog-open");
      portrait.focus({ preventScroll: true });
    });
    photoDialog.addEventListener("click", event => {
      if (event.target !== photoDialog) return;
      const bounds = photoDialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) photoDialog.close();
    });
  }

  function renderProjects(filter = "all") {
    const visible = projects.filter((project) => filter === "all" || project.category === filter);
    const fragment = document.createDocumentFragment();
    visible.forEach((project, index) => {
      const category = categoryFor(project.category);
      const card = make("button", "project-card");
      card.type = "button";
      card.classList.toggle("project-card-real", !project.placeholder);
      if (Number.isFinite(project.displayAspectRatio) && project.displayAspectRatio > 0) {
        card.classList.add("project-card-native");
        card.style.setProperty("--project-aspect", project.displayAspectRatio);
      }
      applyCardGlow(card, project);
      card.dataset.projectId = project.id;
      card.id = "project-" + project.id;
      card.dataset.category = project.category;
      card.dataset.galleryLayout = project.galleryLayout || '';
      card.style.setProperty("--card-index", Math.min(index, 5));
      card.style.setProperty("--next-project", `--project-${index + 1}`);
      card.style.viewTimelineName = `--project-${index}`;
      card.setAttribute("aria-haspopup", "dialog");
      const image = make("div", "project-image");
      addCover(image, project);
      const info = make("div", "project-info");
      const description = make("div");
      description.append(make("h3", "", project.title), make("p", "", project.subtitle ?? ""));
      const arrow = make("span", "project-open", "查看案例");
      arrow.setAttribute("aria-hidden", "true");
      arrow.append(make("span", "arrow-icon"));
      info.append(make("span", "project-number", String(project.displayNumber).padStart(2, "0")), description, arrow);
      const visuals = make("div", "project-visuals");
      const support = make("div", "project-support");
      const previews = project.placeholder ? ["项目背景", "创意过程"] : project.cardPreviews ?? (project.gallery ?? []).filter(item => (typeof item === "string" ? item : item.src) !== project.heroImage).slice(0, 2);
      support.classList.toggle("project-support-single", previews.length === 1);
      support.hidden = previews.length === 0;
      visuals.classList.toggle("project-visuals-single", previews.length === 0);
      previews.forEach((item, stage) => {
        const slot = make("div", "case-image-slot");
        slot.setAttribute("aria-hidden", "true");
        if (project.placeholder) slot.append(make("strong", "", item), make("small", "", "案例展示位"));
        const previewItem = project.placeholder ? project.gallery?.[stage] : item;
        const source = safeImage(typeof previewItem === "string" ? previewItem : previewItem?.src);
        if (source) {
          const preview = make("img");
          preview.src = source;
          preview.alt = "";
          preview.loading = "lazy";
          preview.addEventListener("error", () => preview.remove(), { once: true });
          slot.append(preview);
        }
        support.append(slot);
      });
      visuals.append(support, image);
      card.append(info, make("p", "project-category", `${category?.label ?? "作品"}${project.placeholder ? " / 案例展示位" : project.year ? ` / ${project.year}` : ""}`), visuals);
      card.addEventListener("click", () => openProject(project));
      fragment.append(card);
    });
    grid.replaceChildren(fragment);
    document.querySelector("#work-empty").hidden = visible.length > 0;
    const reservedCount = visible.filter(project => project.placeholder).length;
    document.querySelector("#filter-status").textContent = `${filter === "all" ? "全部作品" : categoryFor(filter)?.label ?? "作品"}，共 ${visible.length} 个案例${reservedCount ? `，其中 ${reservedCount} 个待补充` : ""}`;
    document.querySelector(".framework-note").hidden = !visible.some((project) => project.placeholder);
    document.querySelectorAll(".filter").forEach((button) => {
      const selected = button.dataset.filter === filter;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }
  document.querySelectorAll(".filter").forEach((button) => {
    const filter = button.dataset.filter;
    const count = filter === "all" ? projects.length : projects.filter((project) => project.category === filter).length;
    button.querySelector("span").textContent = String(count).padStart(2, "0");
    button.addEventListener("click", () => renderProjects(filter));
  });
  document.querySelector("#reset-filter").addEventListener("click", () => renderProjects());
  renderProjects();

  // Keep completed work in the preview; reserved slots remain in the case list.
  const reelProjects = [...projects, ...(Array.isArray(content.reelOnly) ? content.reelOnly : [])].filter(project => !project.placeholder && safeImage(project.cardImage || project.image));
  for (const [rowIndex, selector] of ["#marquee-top", "#marquee-bottom"].entries()) {
    const row = document.querySelector(selector);
    const items = reelProjects.filter((_, index) => index % 2 === rowIndex);
    row.dataset.unitCount = String(items.length);
    // Center the leading three artworks in the middle copy at every viewport width.
    row.style.setProperty("--reel-focus-index", items.length + (Math.min(3, items.length) - 1) / 2);
    for (let copy = 0; copy < 3; copy++) {
      for (const project of items) {
        const tile = make("div", "reel-card");
        tile.dataset.projectId = project.id;
        tile.dataset.reelCopy = String(copy);
        tile.classList.toggle("reel-card-real", !project.placeholder);
        applyCardGlow(tile, project);
        tile.setAttribute("aria-hidden", "true");
        const reelArtwork = window.SEAN_REEL_ARTWORK?.[project.id];
        addCover(tile, reelArtwork ? { ...project, cardImage: reelArtwork.src, cardImageSize: reelArtwork.size } : project);
        row.append(tile);
      }
    }
  }
  document.querySelectorAll("[data-category-link]").forEach((link) => {
    link.addEventListener("click", () => renderProjects(link.dataset.categoryLink));
  });

  function openProject(project) {
    const category = categoryFor(project.category);
    document.querySelector("#dialog-category").textContent = category?.label ?? "作品案例";
    document.querySelector("#dialog-meta").textContent = project.placeholder ? "PROJECT PREVIEW / 案例展示位" : [category?.english, project.year].filter(Boolean).join(" / ");
    document.querySelector("#dialog-title").textContent = project.title;
    document.querySelector("#dialog-summary").textContent = project.summary ?? "";
    const cover = document.querySelector("#dialog-cover");
    cover.replaceChildren();
    cover.classList.toggle("is-real", !project.placeholder);
    addCover(cover, project.heroImage ? { ...project, image: project.heroImage, imageSize: project.heroSize } : project, false);
    const hero = cover.querySelector("img");
    if (!project.placeholder && hero) {
      const original = make("a", "artwork-original");
      original.href = safeImage(project.heroOriginalSrc) || hero.src;original.target = "_blank";original.rel = "noopener";
      original.setAttribute("aria-label", `${project.title}，主画面，查看原图`);
      original.append(hero);cover.append(original);
    }
    const facts = document.querySelector("#project-facts");
    facts.replaceChildren();
    for (const [label, value] of [["项目时间", project.year], ["负责内容", project.role], ["项目 / 品牌", project.client]]) {
      if (!value && !project.placeholder) continue;
      const fact = make("dl");
      fact.append(make("dt", "", label), make("dd", "", value || "待补充"));
      facts.append(fact);
    }
    facts.hidden = !facts.children.length;
    const body = document.querySelector("#dialog-body");
    body.replaceChildren();
    if (project.placeholder) {
      const placeholder = make("div", "case-placeholder");
      placeholder.append(make("h3", "", "这个位置，留给你的好作品。"), make("p", "", "后续将呈现项目背景、设计思路与最终效果。当前画面为版式占位，具体案例内容待补充。"));
      const steps = make("div", "case-steps");
      ["项目背景", "创意过程", "视觉呈现", "落地效果"].forEach((label) => steps.append(make("span", "", label)));
      placeholder.append(steps);
      body.append(placeholder);
    }
    for (const section of project.sections ?? []) {
      const block = make("section", "case-section");
      block.append(make("h3", "", section.title), make("p", "", section.text));
      body.append(block);
    }
    const gallery = document.querySelector("#dialog-gallery");
    gallery.replaceChildren();
    gallery.dataset.project = project.id;
    gallery.dataset.layout = project.galleryLayout || '';
    let galleryGroup;
    const groupHeadings = [];
    for (const [index, item] of (project.gallery ?? []).entries()) {
      const source = typeof item === "string" ? item : item.src;
      if (source === project.heroImage) continue;
      const url = safeImage(source);
      if (!url) continue;
      if (item.group && item.group !== galleryGroup) {
        galleryGroup = item.group;
        const heading = make("h3", "gallery-heading", galleryGroup);
        heading.tabIndex = -1;
        gallery.append(heading);
        groupHeadings.push(heading);
      }
      const figure = make("figure");
      if ((project.id === "event-11" && item.size?.[0] >= 1000) || (project.galleryLayout === "photo-grid" && item.fullWidth)) figure.classList.add("gallery-wide");
      const image = make("img");
      image.src = url;
      image.alt = typeof item === "string" ? `${project.title}，展示图 ${index + 1}` : item.alt || `${project.title}，展示图 ${index + 1}`;
      image.loading = "lazy";
      if (typeof item === "object" && item.size?.every(value => Number.isFinite(value) && value > 0)) [image.width, image.height] = item.size;
      image.addEventListener("error", () => {
        image.replaceWith(make("p", "gallery-error", `展示图 ${index + 1} 暂时无法加载`));
      }, { once: true });
      const original = make("a", "artwork-original");
      original.href = safeImage(typeof item === "object" ? item.originalSrc : null) || url;original.target = "_blank";original.rel = "noopener";
      original.setAttribute("aria-label", `${image.alt}，查看原图`);
      original.append(image);figure.append(original);
      if (typeof item === "object" && item.caption) figure.append(make("figcaption", "", item.caption));
      gallery.append(figure);
    }
    if (groupHeadings.length > 1) {
      const chapters = make("nav", "gallery-chapters");
      chapters.setAttribute("aria-label", "案例章节");
      for (const heading of groupHeadings) {
        const jump = make("button", "", heading.textContent);
        jump.type = "button";
        jump.addEventListener("click", () => {
          heading.focus({ preventScroll: true });
          heading.scrollIntoView({ block: "start" });
        });
        chapters.append(jump);
      }
      gallery.prepend(chapters);
    }
    dialog.showModal();
    dialog.scrollTop = 0;
    document.body.classList.add("dialog-open");
  }
  document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });

  const contacts = document.querySelector("#contact-methods");
  const email = typeof profile.email === "string" ? profile.email.trim() : "";
  const wechat = typeof profile.wechat === "string" ? profile.wechat.trim() : "";
  function copyContact(label, value, accessibleLabel, successMessage) {
    const button = make("button", "contact-method");
    button.type = "button";
    button.append(make("span", "", label), make("span", "", "复制"));
    button.setAttribute("aria-label", accessibleLabel);
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(value);
        toast(successMessage);
      } catch {
        button.style.userSelect = "text";
        toast("复制受限，可选中文字手动复制");
      }
    });
    contacts.append(button);
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    copyContact(email, email, `复制邮箱 ${email}`, "邮箱已复制");
  } else {
    const button = make("button", "contact-method", "邮箱 · 待补充");
    button.disabled = true;
    contacts.append(button);
  }
  if (wechat) {
    copyContact(`手机 / 微信：${wechat}`, wechat, `复制手机 / 微信号 ${wechat}`, "手机 / 微信号已复制");
  } else {
    const button = make("button", "contact-method", "微信 · 待补充");
    button.disabled = true;
    contacts.append(button);
  }
  document.querySelector("#contact-note").hidden = Boolean(email && wechat);

  const themeButtons = document.querySelectorAll(".theme-toggle");
  function currentTheme() {
    return document.documentElement.dataset.theme || "dark";
  }
  function updateThemeLabel() {
    const dark = currentTheme() === "dark";
    themeButtons.forEach(button => {
      button.querySelector(".theme-label").textContent = dark ? "浅色" : "深色";
      button.setAttribute("aria-label", dark ? "切换为浅色配色" : "切换为深色配色");
      button.setAttribute("title", dark ? "切换为浅色配色" : "切换为深色配色");
      button.setAttribute("aria-pressed", String(!dark));
    });
    document.querySelector('meta[name="theme-color"]').content = dark ? "#0c0c0c" : "#e6e7eb";
  }
  try {
    const saved = localStorage.getItem("portfolio-jack-theme");
    if (["light", "dark"].includes(saved)) document.documentElement.dataset.theme = saved;
  } catch { /* Theme switching still works when local storage is disabled. */ }
  updateThemeLabel();
  themeButtons.forEach(button => button.addEventListener("click", () => {
    const theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("portfolio-jack-theme", theme); } catch { /* Optional persistence. */ }
    updateThemeLabel();
  }));

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    document.documentElement.classList.add("js");
  }

  // A quiet, static backdrop matching the new MotionSites landing scene.
  function initializeHero() {
    const canvas = document.querySelector("#hero-canvas");
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const resize = new ResizeObserver(([entry]) => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(entry.contentRect.width * ratio);
      canvas.height = Math.round(entry.contentRect.height * ratio);
      context.fillStyle = "#0c0c0c";
      context.fillRect(0, 0, canvas.width, canvas.height);
    });
    resize.observe(document.querySelector(".hero"));
    window.addEventListener("pagehide", () => resize.disconnect(), { once: true });
  }
  initializeHero();
})();
