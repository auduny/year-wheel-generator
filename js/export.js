/* Download the wheel as SVG or PNG. */
(function (root) {
  'use strict';

  function serialize(svg) {
    const clone = svg.cloneNode(true);
    let s = new XMLSerializer().serializeToString(clone);
    if (!s.startsWith('<?xml')) s = '<?xml version="1.0" encoding="UTF-8"?>\n' + s;
    return s;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadSvg(svg, filename) {
    downloadBlob(new Blob([serialize(svg)], { type: 'image/svg+xml;charset=utf-8' }), filename);
  }

  function downloadPng(svg, filename, scale) {
    scale = scale || 3;
    return new Promise((resolve, reject) => {
      const s = serialize(svg);
      const w = Number(svg.getAttribute('width')) || 1000;
      const h = Number(svg.getAttribute('height')) || 1000;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('PNG encoding failed'));
          downloadBlob(blob, filename);
          resolve();
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('SVG could not be rasterized'));
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(s)));
    });
  }

  root.Exporter = { serialize, downloadBlob, downloadSvg, downloadPng };
})(window);
