/* Builds the year wheel as an SVG element from the app state.
 * Everything the wheel needs (colors, fonts) lives inside the SVG so exports are self-contained. */
(function (root) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const W = 1000;
  const CX = 500;
  const CY = 500;
  const R_OUTER = 470;
  const MONTH_W = 32;
  const WEEK_W = 18;
  const R_HOLE = 120;
  const MAX_RING_W = 110;
  const LEGEND_ROW = 22;
  const FONT = '-apple-system, "Segoe UI", Helvetica, Arial, sans-serif';

  function el(name, attrs, children) {
    const node = document.createElementNS(NS, name);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      for (const c of children) {
        if (c == null) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  const num = (n) => Math.round(n * 100) / 100;

  // 0 degrees at 12 o'clock, clockwise.
  function polar(r, deg) {
    const a = ((deg - 90) * Math.PI) / 180;
    return { x: num(CX + r * Math.cos(a)), y: num(CY + r * Math.sin(a)) };
  }

  function wedgePath(rOuter, rInner, a0, a1) {
    const large = a1 - a0 > 180 ? 1 : 0;
    const p1 = polar(rOuter, a0);
    const p2 = polar(rOuter, a1);
    const p3 = polar(rInner, a1);
    const p4 = polar(rInner, a0);
    return `M${p1.x} ${p1.y} A${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y} ` +
      `L${p3.x} ${p3.y} A${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
  }

  // Open arc from a0 to a1. When reversed, it runs a1 -> a0 counterclockwise so
  // text along it reads left-to-right in the bottom half of the wheel.
  function arcPath(r, a0, a1, reverse) {
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    if (!reverse) {
      const p1 = polar(r, a0);
      const p2 = polar(r, a1);
      return `M${p1.x} ${p1.y} A${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`;
    }
    const p1 = polar(r, a1);
    const p2 = polar(r, a0);
    return `M${p1.x} ${p1.y} A${r} ${r} 0 ${large} 0 ${p2.x} ${p2.y}`;
  }

  // Label running along the ring, starting just clockwise of the given angle.
  // Flipped in the bottom half so it stays upright; it still occupies the arc
  // after the marker in both cases.
  function ringLabel(r, deg, text, attrs) {
    const flip = deg > 90 && deg < 270;
    const p = polar(r, deg);
    return el('text', Object.assign({
      x: p.x,
      y: p.y,
      transform: `rotate(${num(flip ? deg + 180 : deg)} ${p.x} ${p.y})`,
      'text-anchor': flip ? 'end' : 'start',
      'dominant-baseline': 'middle',
    }, attrs), [text]);
  }

  // Text running along the circle (tangent) at the given angle, flipped in the
  // bottom half so it never reads upside down. Plain rotated text, not textPath,
  // because textPath is unsupported or buggy in several SVG consumers.
  function tangentText(r, deg, text, attrs) {
    const flip = deg > 90 && deg < 270;
    const p = polar(r, deg);
    return el('text', Object.assign({
      x: p.x,
      y: p.y,
      transform: `rotate(${num(flip ? deg + 180 : deg)} ${p.x} ${p.y})`,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    }, attrs), [text]);
  }

  // Keeps an event label inside its ring: slightly too long labels are condensed,
  // much too long ones are truncated with an ellipsis. The legend has the full text.
  function fitLabel(text, avail, fontSize) {
    const charW = fontSize * 0.55;
    const est = text.length * charW;
    if (est <= avail) return { text, attrs: {} };
    const squeeze = { textLength: num(avail), lengthAdjust: 'spacingAndGlyphs' };
    if (est <= avail * 1.3) return { text, attrs: squeeze };
    const maxChars = Math.max(1, Math.floor((avail * 1.3) / charW) - 1);
    return { text: text.slice(0, maxChars).trimEnd() + '…', attrs: squeeze };
  }

  function fitFontSize(text, maxWidth, preferred, min) {
    const est = text.length * preferred * 0.55;
    if (est <= maxWidth) return preferred;
    return Math.max(min, maxWidth / (text.length * 0.55));
  }

  function buildSvg(state) {
    const R = root.Recurrence;
    const I = root.I18n;
    const year = Number(state.year);
    const cats = state.categories || [];
    const events = state.events || [];
    const showWeeks = !!state.showWeekNumbers;
    const showLegend = state.showLegend !== false;

    const rCatOuter = R_OUTER - MONTH_W - (showWeeks ? WEEK_W : 0);
    const avail = rCatOuter - R_HOLE;
    const ringW = cats.length ? Math.min(MAX_RING_W, avail / cats.length) : 0;
    const halfDay = 180 / R.daysInYear(year);

    // Legend rows: category heading followed by its events.
    const legendRows = [];
    if (showLegend) {
      for (const c of cats) {
        legendRows.push({ kind: 'cat', cat: c });
        for (const e of events) {
          if (e.categoryId === c.id) legendRows.push({ kind: 'ev', ev: e, cat: c });
        }
      }
    }
    const perCol = Math.ceil(legendRows.length / 2);
    const legendH = legendRows.length ? 60 + perCol * LEGEND_ROW : 0;
    const H = W + legendH;

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
    svg.appendChild(el('style', null, [`text{font-family:${FONT}}`]));
    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff' }));

    // 1. Month ring
    const gMonths = el('g', { class: 'months' });
    for (let m = 1; m <= 12; m++) {
      const a0 = R.monthStartAngle(year, m);
      const a1 = R.monthEndAngle(year, m);
      gMonths.appendChild(el('path', {
        d: wedgePath(R_OUTER, R_OUTER - MONTH_W, a0, a1),
        fill: m % 2 ? '#e2e8f0' : '#f1f5f9',
      }));
      gMonths.appendChild(tangentText(R_OUTER - MONTH_W / 2, (a0 + a1) / 2, I.monthName(m),
        { 'font-size': 15, 'font-weight': 600, fill: '#334155' }));
    }
    svg.appendChild(gMonths);

    // 2. Week-number ring
    if (showWeeks) {
      const g = el('g', { class: 'weeks' });
      const rO = R_OUTER - MONTH_W;
      const rI = rO - WEEK_W;
      const rMid = (rO + rI) / 2;
      g.appendChild(el('circle', { cx: CX, cy: CY, r: rMid, fill: 'none', stroke: '#f8fafc', 'stroke-width': WEEK_W }));
      const weeks = R.isoWeeksInYear(year);
      weeks.forEach((wk, i) => {
        const aStart = R.angleFor(wk.date, year);
        const next = weeks[i + 1];
        const aEnd = next ? R.angleFor(next.date, year) : 360;
        if (i > 0) {
          const p1 = polar(rI, aStart);
          const p2 = polar(rO, aStart);
          g.appendChild(el('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: '#cbd5e1', 'stroke-width': 1 }));
        }
        if (aEnd - aStart < 3) return; // partial week too narrow for a label
        const mid = (aStart + aEnd) / 2;
        g.appendChild(tangentText(rMid, mid, String(wk.week), { 'font-size': 9, fill: '#64748b' }));
      });
      g.appendChild(el('circle', { cx: CX, cy: CY, r: rO, fill: 'none', stroke: '#cbd5e1', 'stroke-width': 1 }));
      g.appendChild(el('circle', { cx: CX, cy: CY, r: rI, fill: 'none', stroke: '#cbd5e1', 'stroke-width': 1 }));
      svg.appendChild(g);
    }

    // 3. Category rings
    const gRings = el('g', { class: 'rings' });
    const ringGeom = {};
    cats.forEach((c, i) => {
      const outer = rCatOuter - i * ringW;
      const inner = outer - ringW;
      ringGeom[c.id] = { outer, inner };
      gRings.appendChild(el('circle', {
        cx: CX, cy: CY, r: num((outer + inner) / 2), fill: 'none',
        stroke: c.color, 'stroke-opacity': 0.12, 'stroke-width': num(ringW),
      }));
      gRings.appendChild(el('circle', {
        cx: CX, cy: CY, r: num(inner), fill: 'none', stroke: c.color, 'stroke-opacity': 0.5, 'stroke-width': 1,
      }));
    });
    svg.appendChild(gRings);

    // Month and quarter grid lines across the rings
    const gGrid = el('g', { class: 'grid' });
    for (let m = 1; m <= 12; m++) {
      const a = R.monthStartAngle(year, m);
      const quarter = (m - 1) % 3 === 0;
      const p1 = polar(R_HOLE, a);
      const p2 = polar(R_OUTER, a);
      gGrid.appendChild(el('line', {
        x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
        stroke: quarter ? '#94a3b8' : '#cbd5e1', 'stroke-width': quarter ? 2 : 1,
      }));
    }
    svg.appendChild(gGrid);

    // Center hole and quarter labels
    svg.appendChild(el('circle', { cx: CX, cy: CY, r: R_HOLE, fill: '#ffffff', stroke: '#e2e8f0', 'stroke-width': 1 }));
    for (let q = 0; q < 4; q++) {
      const a0 = R.monthStartAngle(year, q * 3 + 1);
      const a1 = R.monthEndAngle(year, q * 3 + 3);
      const p = polar(R_HOLE - 16, (a0 + a1) / 2);
      svg.appendChild(el('text', {
        x: p.x, y: p.y, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        'font-size': 12, 'font-weight': 600, fill: '#94a3b8',
      }, [I.t('quarter') + (q + 1)]));
    }

    // 4. Event markers. Dots sit on the ring's center line with the label running
    // along the ring after them; weekly ticks sit at the ring's inner edge.
    const gEv = el('g', { class: 'events' });
    const fontSize = ringW >= 40 ? 11 : 10;
    for (const ev of events) {
      const geo = ringGeom[ev.categoryId];
      const cat = cats.find((c) => c.id === ev.categoryId);
      if (!geo || !cat) continue;
      const type = ev.recurrence && ev.recurrence.type;
      const dates = R.expandEvent(ev, year);
      const labelAll = type === 'yearly' || type === 'quarterly';
      const rMid = (geo.inner + geo.outer) / 2;
      const dotR = type === 'monthly' ? 4 : 5.5;
      const gapDeg = ((dotR + 4) / rMid) * (180 / Math.PI);
      const labelAvail = Math.max(60, rMid * 0.5);
      dates.forEach((d, idx) => {
        const a = R.angleFor(d, year) + halfDay;
        const g = el('g', { class: 'event' });
        g.appendChild(el('title', null, [`${ev.title} – ${I.formatDate(d)}`]));
        if (type === 'weekly') {
          const p1 = polar(geo.inner + 3, a);
          const p2 = polar(geo.inner + 13, a);
          g.appendChild(el('line', {
            x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
            stroke: cat.color, 'stroke-width': 2, 'stroke-linecap': 'round',
          }));
        } else {
          const p = polar(rMid, a);
          g.appendChild(el('circle', {
            cx: p.x, cy: p.y, r: dotR, fill: cat.color, stroke: '#ffffff', 'stroke-width': 1.5,
          }));
        }
        if (labelAll || idx === 0) {
          const fit = fitLabel(ev.title, labelAvail, fontSize);
          g.appendChild(ringLabel(rMid, a + (type === 'weekly' ? gapDeg / 2 : gapDeg), fit.text,
            Object.assign({ 'font-size': fontSize, fill: '#1e293b' }, fit.attrs)));
        }
        gEv.appendChild(g);
      });
    }
    svg.appendChild(gEv);

    // 5. Center title and year
    const title = (state.title || '').trim() || I.t('defaultTitle');
    const titleSize = fitFontSize(title, 2 * R_HOLE - 30, 26, 12);
    svg.appendChild(el('text', {
      x: CX, y: CY - 6, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': num(titleSize), 'font-weight': 700, fill: '#0f172a',
    }, [title]));
    svg.appendChild(el('text', {
      x: CX, y: CY + 24, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 20, fill: '#64748b',
    }, [String(year)]));

    // 6. Legend
    if (legendRows.length) {
      const g = el('g', { class: 'legend' });
      const y0 = W + 10;
      g.appendChild(el('line', { x1: 40, y1: y0, x2: 960, y2: y0, stroke: '#e2e8f0', 'stroke-width': 1 }));
      g.appendChild(el('text', { x: 40, y: y0 + 24, 'font-size': 14, 'font-weight': 700, fill: '#334155' }, [I.t('legend')]));
      legendRows.forEach((row, i) => {
        const col = Math.floor(i / perCol);
        const r = i % perCol;
        const x = 40 + col * 470;
        const y = y0 + 40 + r * LEGEND_ROW + 12;
        if (row.kind === 'cat') {
          g.appendChild(el('rect', { x, y: y - 7, width: 14, height: 14, rx: 3, fill: row.cat.color }));
          g.appendChild(el('text', { x: x + 22, y, 'dominant-baseline': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#1e293b' }, [row.cat.name]));
        } else {
          g.appendChild(el('circle', { cx: x + 27, cy: y, r: 4, fill: row.cat.color }));
          g.appendChild(el('text', { x: x + 38, y, 'dominant-baseline': 'middle', 'font-size': 12, fill: '#374151' },
            [`${row.ev.title} – ${I.describeRecurrence(row.ev.recurrence)}`]));
        }
      });
      svg.appendChild(g);
    }

    return svg;
  }

  root.Render = { buildSvg, polar, wedgePath, arcPath };
})(window);
