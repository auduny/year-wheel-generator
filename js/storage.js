/* localStorage persistence and JSON import/export with validation. */
(function (root) {
  'use strict';

  const KEY = 'yearwheel:v1';
  const TYPES = ['yearly', 'quarterly', 'monthly', 'weekly', 'daily'];

  function uid() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') return root.crypto.randomUUID();
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function clampInt(v, lo, hi, def) {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return def;
    return Math.min(hi, Math.max(lo, n));
  }

  function withSeason(out, r) {
    const from = clampInt(r.fromMonth, 1, 12, null);
    const to = clampInt(r.toMonth, 1, 12, null);
    if (from != null && to != null) Object.assign(out, { fromMonth: from, toMonth: to });
    return out;
  }

  function normalizeRecurrence(r) {
    switch (r.type) {
      case 'yearly':
        return { type: 'yearly', month: clampInt(r.month, 1, 12, 1), day: clampInt(r.day, 1, 31, 1) };
      case 'quarterly':
        return { type: 'quarterly', monthInQuarter: clampInt(r.monthInQuarter, 1, 3, 1), day: clampInt(r.day, 1, 31, 1) };
      case 'monthly':
        return withSeason({ type: 'monthly', day: r.day === 'last' ? 'last' : clampInt(r.day, 1, 31, 1) }, r);
      case 'weekly':
        return withSeason({ type: 'weekly', weekday: clampInt(r.weekday, 0, 6, 0) }, r);
      case 'daily':
        return withSeason({ type: 'daily' }, r);
      default:
        return null;
    }
  }

  // Turns untrusted JSON into a well-formed state object, or throws.
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('not a year wheel file');
    if (raw.version != null && raw.version !== 1) throw new Error('unsupported version ' + raw.version);

    const categories = (Array.isArray(raw.categories) ? raw.categories : [])
      .filter((c) => c && typeof c === 'object')
      .map((c) => ({
        id: String(c.id || uid()),
        name: String(c.name || ''),
        color: /^#[0-9a-f]{6}$/i.test(String(c.color)) ? String(c.color).toLowerCase() : '#3b82f6',
      }));
    const ids = new Set(categories.map((c) => c.id));

    const events = (Array.isArray(raw.events) ? raw.events : [])
      .filter((e) => e && typeof e === 'object' && e.recurrence && TYPES.includes(e.recurrence.type))
      .filter((e) => ids.has(String(e.categoryId)))
      .map((e) => ({
        id: String(e.id || uid()),
        title: String(e.title || ''),
        categoryId: String(e.categoryId),
        recurrence: normalizeRecurrence(e.recurrence),
      }));

    const year = Number(raw.year);
    return {
      version: 1,
      year: Number.isInteger(year) && year >= 1900 && year <= 9999 ? year : new Date().getFullYear(),
      lang: raw.lang === 'en' ? 'en' : 'nb',
      title: String(raw.title || ''),
      showWeekNumbers: raw.showWeekNumbers !== false,
      showLegend: raw.showLegend !== false,
      categories,
      events,
    };
  }

  function load() {
    try {
      const s = root.localStorage.getItem(KEY);
      return s ? normalize(JSON.parse(s)) : null;
    } catch (e) {
      return null;
    }
  }

  let timer = null;
  function save(state) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        root.localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {
        /* storage unavailable (private mode, quota); the in-memory state still works */
      }
    }, 200);
  }

  function clear() {
    try { root.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  function exportJSON(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    root.Exporter.downloadBlob(blob, `yearwheel-${state.year}.json`);
  }

  function importJSON(file) {
    return file.text().then((text) => normalize(JSON.parse(text)));
  }

  root.Store = { KEY, uid, normalize, load, save, clear, exportJSON, importJSON };
})(window);
