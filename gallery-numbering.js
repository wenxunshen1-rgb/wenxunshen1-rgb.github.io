(function (root) {
  "use strict";

  function numberGalleryPages(gallery) {
    let pageNumber = 0;
    return gallery.map(item => {
      if (typeof item !== "object") return item;
      const caption = item.caption ?? "";
      const chinesePage = /^第\s*\d+\s*页/.test(caption);
      const sourcePage = /(?:方案|卷)\s+P\s*\d+$/.test(caption);
      if (!chinesePage && !sourcePage) return item;
      const number = String(++pageNumber).padStart(2, "0");
      const marker = chinesePage ? /第\s*\d+\s*页/ : /\bP\s*\d+$/;
      const replace = text => text?.replace(marker, chinesePage ? `第${number}页` : `P${number}`);
      return { ...item, caption: replace(item.caption), alt: replace(item.alt) };
    });
  }

  if (typeof module === "object" && module.exports) module.exports = { numberGalleryPages };
  else root.SEAN_GALLERY_NUMBERING = numberGalleryPages;
})(typeof window === "object" ? window : globalThis);
