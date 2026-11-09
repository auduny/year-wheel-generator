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
  const SIDE = 320; // width of each column of recurrence boxes beside the wheel
  const BOX_GAP = 24;
  const BOX_ROW = 40;
  const KEY_H = 56;
  const BOX_TYPES = ['yearly', 'quarterly', 'monthly', 'weekly']; // TL, TR, BL, BR
  const DAILY_COL = 300;
  const DAILY_ROW = 28;
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

  // Horizontal label to the right of a point on the ring, so it reads
  // dot-then-text everywhere. A white halo keeps it readable over grid lines.
  function flatLabel(r, deg, gap, text, attrs) {
    const p = polar(r, deg);
    return el('text', Object.assign({
      x: num(p.x + gap),
      y: p.y,
      'dominant-baseline': 'middle',
      stroke: '#ffffff', 'stroke-width': 3, 'stroke-linejoin': 'round', 'paint-order': 'stroke',
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

  // Ordering within a box: by when in the period the event happens.
  function sortKey(r) {
    const day = (d) => (d === 'last' ? 32 : Number(d) || 0);
    switch (r.type) {
      case 'yearly': return r.month * 100 + day(r.day);
      case 'quarterly': return r.monthInQuarter * 100 + day(r.day);
      case 'monthly': return day(r.day);
      case 'weekly': return r.weekday;
      default: return 0;
    }
  }

  // One box listing every event of a recurrence type: title first, the
  // specific date as secondary text.
  function recurrenceBox(x, y, w, h, type, items, I) {
    const g = el('g', { class: `box box-${type}` });
    boxFrame(g, x, y, w, h, type, I);

    const top = y + 62;
    const availH = h - 62 - 12;
    if (!items.length) {
      g.appendChild(el('text', { x: x + 20, y: top + 14, 'font-size': 14, fill: '#94a3b8' }, ['–']));
      return g;
    }
    // Shrink rows to fit; past the minimum size, the rest is summarized.
    const scale = Math.max(0.65, Math.min(1, availH / (items.length * BOX_ROW)));
    const rowH = BOX_ROW * scale;
    const maxRows = Math.floor(availH / rowH);
    const overflow = items.length > maxRows;
    const shown = overflow ? items.slice(0, maxRows - 1) : items;
    const titleSize = num(14 * scale);
    const detailSize = num(12 * scale);
    const textX = x + 38;
    const textW = w - 38 - 16;
    shown.forEach(({ ev, cat }, i) => {
      const ry = top + i * rowH;
      g.appendChild(el('circle', { cx: x + 26, cy: num(ry + rowH * 0.32), r: num(5 * scale), fill: cat.color }));
      const fitT = fitLabel(ev.title, textW, titleSize);
      g.appendChild(el('text', Object.assign({
        x: textX, y: num(ry + rowH * 0.32), 'dominant-baseline': 'middle',
        'font-size': titleSize, 'font-weight': 600, fill: '#1e293b',
      }, fitT.attrs), [fitT.text]));
      const fitD = fitLabel(I.describeRecurrence(ev.recurrence), textW, detailSize);
      g.appendChild(el('text', Object.assign({
        x: textX, y: num(ry + rowH * 0.72), 'dominant-baseline': 'middle',
        'font-size': detailSize, fill: '#64748b',
      }, fitD.attrs), [fitD.text]));
    });
    if (overflow) {
      g.appendChild(el('text', {
        x: textX, y: num(top + shown.length * rowH + rowH / 2), 'dominant-baseline': 'middle',
        'font-size': detailSize, 'font-style': 'italic', fill: '#64748b',
      }, [I.t('moreItems').replace('{n}', items.length - shown.length)]));
    }
    return g;
  }

  function boxFrame(g, x, y, w, h, type, I) {
    g.appendChild(el('rect', { x, y, width: w, height: h, rx: 10, fill: '#f8fafc', stroke: '#e2e8f0', 'stroke-width': 1 }));
    g.appendChild(el('text', { x: x + 20, y: y + 34, 'font-size': 18, 'font-weight': 700, fill: '#0f172a' },
      [I.t('box' + type[0].toUpperCase() + type.slice(1))]));
    g.appendChild(el('line', { x1: x + 20, y1: y + 50, x2: x + w - 20, y2: y + 50, stroke: '#e2e8f0', 'stroke-width': 1 }));
  }

  // Daily activities in a wide box below the wheel, laid out in columns. They
  // happen every day, so the only secondary info is a season, if any.
  function dailyHeight(count, w) {
    const cols = Math.max(1, Math.floor((w - 40) / DAILY_COL));
    return 62 + Math.ceil(count / cols) * DAILY_ROW + 10;
  }

  function dailyBox(x, y, w, items, I) {
    const g = el('g', { class: 'box box-daily' });
    boxFrame(g, x, y, w, dailyHeight(items.length, w), 'daily', I);
    const cols = Math.max(1, Math.floor((w - 40) / DAILY_COL));
    const colW = (w - 40) / cols;
    items.forEach(({ ev, cat }, i) => {
      const cx = x + 20 + (i % cols) * colW;
      const cy = y + 62 + Math.floor(i / cols) * DAILY_ROW + DAILY_ROW / 2;
      g.appendChild(el('circle', { cx: cx + 6, cy, r: 5, fill: cat.color }));
      const season = I.describeSeason(ev.recurrence);
      const fit = fitLabel(ev.title, colW - 30 - (season ? season.length * 7 + 8 : 0), 14);
      g.appendChild(el('text', {
        x: cx + 18, y: cy, 'dominant-baseline': 'middle', 'font-size': 14, fill: '#1e293b',
      }, [
        el('tspan', Object.assign({ 'font-weight': 600 }, fit.attrs), [fit.text]),
        season ? el('tspan', { dx: 8, 'font-size': 12, fill: '#64748b' }, [season]) : null,
      ]));
    });
    return g;
  }

  // Category swatches in centered, wrapping rows.
  function categoryKey(cats, y0, width) {
    const g = el('g', { class: 'category-key' });
    const fontSize = 14;
    const items = cats.map((c) => ({ c, w: 22 + c.name.length * fontSize * 0.55 }));
    const rows = [[]];
    let rowW = 0;
    for (const it of items) {
      const add = (rows[rows.length - 1].length ? 28 : 0) + it.w;
      if (rowW + add > width - 80 && rows[rows.length - 1].length) { rows.push([]); rowW = 0; }
      rowW += (rows[rows.length - 1].length ? 28 : 0) + it.w;
      rows[rows.length - 1].push(it);
    }
    rows.forEach((row, ri) => {
      const total = row.reduce((s, it) => s + it.w, 0) + 28 * (row.length - 1);
      let x = (width - total) / 2;
      const y = y0 + ri * 26;
      for (const it of row) {
        g.appendChild(el('rect', { x: num(x), y: y - 7, width: 14, height: 14, rx: 3, fill: it.c.color }));
        g.appendChild(el('text', { x: num(x + 22), y, 'dominant-baseline': 'middle', 'font-size': fontSize, 'font-weight': 600, fill: '#1e293b' }, [it.c.name]));
        x += it.w + 28;
      }
    });
    return { g, height: rows.length * 26 };
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

    // Recurrence boxes beside the wheel; daily box (when there are daily
    // activities) and category key below it.
    const side = showLegend ? SIDE : 0;
    const totalW = W + 2 * side;
    const boxItems = (type) => events
      .filter((e) => e.recurrence && e.recurrence.type === type)
      .map((ev) => ({ ev, cat: cats.find((c) => c.id === ev.categoryId) }))
      .filter((it) => it.cat)
      .sort((a, b) => sortKey(a.ev.recurrence) - sortKey(b.ev.recurrence));
    const daily = showLegend ? boxItems('daily') : [];
    const dailyW = totalW - 2 * BOX_GAP;
    const belowY = W + (daily.length ? dailyHeight(daily.length, dailyW) + BOX_GAP : 0);
    const key = showLegend && cats.length ? categoryKey(cats, belowY + 14, totalW) : null;
    const H = belowY + (key ? KEY_H + key.height - 26 : 0);

    const svg = el('svg', { viewBox: `0 0 ${totalW} ${H}`, width: totalW, height: H });
    svg.appendChild(el('style', null, [`text{font-family:${FONT}}`]));
    svg.appendChild(el('rect', { x: 0, y: 0, width: totalW, height: H, fill: '#ffffff' }));
    const wheel = el('g', { class: 'wheel', transform: side ? `translate(${side} 0)` : null });
    svg.appendChild(wheel);

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
    wheel.appendChild(gMonths);

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
      wheel.appendChild(g);
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
    wheel.appendChild(gRings);

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
    wheel.appendChild(gGrid);

    // Center hole and quarter labels
    wheel.appendChild(el('circle', { cx: CX, cy: CY, r: R_HOLE, fill: '#ffffff', stroke: '#e2e8f0', 'stroke-width': 1 }));
    for (let q = 0; q < 4; q++) {
      const a0 = R.monthStartAngle(year, q * 3 + 1);
      const a1 = R.monthEndAngle(year, q * 3 + 3);
      const p = polar(R_HOLE - 16, (a0 + a1) / 2);
      wheel.appendChild(el('text', {
        x: p.x, y: p.y, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        'font-size': 12, 'font-weight': 600, fill: '#94a3b8',
      }, [I.t('quarter') + (q + 1)]));
    }

    // 4. Event markers. Dots sit on the ring's center line with the label after
    // them. Weekly events are only listed in their box, not drawn on the wheel.
    const gEv = el('g', { class: 'events' });
    const fontSize = ringW >= 40 ? 11 : 10;
    const dailyCount = {};
    for (const ev of events) {
      const geo = ringGeom[ev.categoryId];
      const cat = cats.find((c) => c.id === ev.categoryId);
      if (!geo || !cat) continue;
      const type = ev.recurrence && ev.recurrence.type;
      if (type === 'weekly') continue;
      if (type === 'daily') {
        // A dot per day would be a solid smear: draw one line near the ring's
        // outer edge, all the way round or over the season, labelled at its start.
        const k = dailyCount[cat.id] = (dailyCount[cat.id] || 0) + 1;
        const r = geo.outer - 6 - (k - 1) * 15;
        const g = el('g', { class: 'event' });
        g.appendChild(el('title', null, [`${ev.title} – ${I.describeRecurrence(ev.recurrence)}`]));
        const line = { fill: 'none', stroke: cat.color, 'stroke-width': 2, 'stroke-dasharray': '1 3' };
        let a0 = 0;
        if (R.hasSeason(ev.recurrence)) {
          const { fromMonth, toMonth } = ev.recurrence;
          a0 = R.monthStartAngle(year, fromMonth);
          let a1 = R.monthEndAngle(year, toMonth);
          if (a1 <= a0) a1 += 360;
          g.appendChild(el('path', Object.assign({ d: arcPath(r, a0, a1) }, line)));
        } else {
          g.appendChild(el('circle', Object.assign({ cx: CX, cy: CY, r: num(r) }, line)));
        }
        const fit = fitLabel(ev.title, Math.max(60, r * 0.5), fontSize);
        g.appendChild(flatLabel(r - 9, a0 + 3, 0, fit.text,
          Object.assign({ 'font-size': fontSize, fill: '#1e293b' }, fit.attrs)));
        gEv.appendChild(g);
        continue;
      }
      const dates = R.expandEvent(ev, year);
      const labelAll = type === 'yearly' || type === 'quarterly';
      const rMid = (geo.inner + geo.outer) / 2;
      const dotR = type === 'monthly' ? 4 : 5.5;
      const labelAvail = Math.max(60, rMid * 0.5);
      // Repeating events are labelled once, at the first date of their season.
      const firstIdx = R.hasSeason(ev.recurrence)
        ? Math.max(0, dates.findIndex((d) => d.getUTCMonth() + 1 === ev.recurrence.fromMonth))
        : 0;
      dates.forEach((d, idx) => {
        const a = R.angleFor(d, year) + halfDay;
        const g = el('g', { class: 'event' });
        g.appendChild(el('title', null, [`${ev.title} – ${I.formatDate(d)}`]));
        const p = polar(rMid, a);
        g.appendChild(el('circle', {
          cx: p.x, cy: p.y, r: dotR, fill: cat.color, stroke: '#ffffff', 'stroke-width': 1.5,
        }));
        if (labelAll || idx === firstIdx) {
          const fit = fitLabel(ev.title, labelAvail, fontSize);
          g.appendChild(flatLabel(rMid, a, dotR + 4, fit.text,
            Object.assign({ 'font-size': fontSize, fill: '#1e293b' }, fit.attrs)));
        }
        gEv.appendChild(g);
      });
    }
    wheel.appendChild(gEv);

    // 5. Center title and year
    const title = (state.title || '').trim() || I.t('defaultTitle');
    const titleSize = fitFontSize(title, 2 * R_HOLE - 30, 26, 12);
    wheel.appendChild(el('text', {
      x: CX, y: CY - 6, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': num(titleSize), 'font-weight': 700, fill: '#0f172a',
    }, [title]));
    wheel.appendChild(el('text', {
      x: CX, y: CY + 24, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': 20, fill: '#64748b',
    }, [String(year)]));

    // 6. Recurrence boxes and category key
    if (showLegend) {
      const boxW = side - BOX_GAP - 8;
      const boxH = (W - 3 * BOX_GAP) / 2;
      BOX_TYPES.forEach((type, i) => {
        const right = i % 2 === 1;
        const x = right ? side + W + 8 : BOX_GAP;
        const y = BOX_GAP + Math.floor(i / 2) * (boxH + BOX_GAP);
        svg.appendChild(recurrenceBox(x, y, boxW, boxH, type, boxItems(type), I));
      });
      if (daily.length) svg.appendChild(dailyBox(BOX_GAP, W, dailyW, daily, I));
      if (key) svg.appendChild(key.g);
    }

    return svg;
  }

  root.Render = { buildSvg, polar, wedgePath, arcPath };
})(window);
