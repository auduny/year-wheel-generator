/* App state, UI wiring, and re-rendering. */
(function () {
  'use strict';

  const t = (k) => I18n.t(k);
  const $ = (id) => document.getElementById(id);
  const PALETTE = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

  let state = Store.load() || defaultState();
  let editingId = null;
  let messageTimer = null;

  function detectLang() {
    const l = (navigator.language || '').toLowerCase();
    return /^(nb|nn|no)/.test(l) ? 'nb' : 'en';
  }

  function defaultState() {
    return {
      version: 1,
      year: new Date().getFullYear(),
      lang: detectLang(),
      title: '',
      showWeekNumbers: true,
      showLegend: true,
      categories: [],
      events: [],
    };
  }

  // ---------- state ----------

  function update(fn) {
    fn(state);
    Store.save(state);
    renderAll();
  }

  function replaceState(next) {
    state = next;
    I18n.setLang(state.lang);
    document.documentElement.lang = state.lang;
    I18n.applyTranslations();
    buildSelects();
    syncSettings();
    Store.save(state);
    renderAll();
  }

  function renderAll() {
    renderWheel();
    renderCategoryList();
    renderCategoryOptions();
    renderEventList();
    syncEventForm();
  }

  function message(text, isError) {
    const el = $('message');
    el.textContent = text;
    el.classList.toggle('error', !!isError);
    el.hidden = false;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => { el.hidden = true; }, 4000);
  }

  // ---------- wheel ----------

  function renderWheel() {
    $('wheel').replaceChildren(Render.buildSvg(state));
  }

  // ---------- settings ----------

  function syncSettings() {
    $('title').value = state.title;
    $('year').value = state.year;
    $('lang').value = state.lang;
    $('showWeekNumbers').checked = !!state.showWeekNumbers;
    $('showLegend').checked = state.showLegend !== false;
    $('newCategoryColor').value = PALETTE[state.categories.length % PALETTE.length];
  }

  function bindSettings() {
    $('title').addEventListener('input', (e) => update((s) => { s.title = e.target.value; }));
    $('year').addEventListener('change', (e) => {
      const y = parseInt(e.target.value, 10);
      if (Number.isInteger(y) && y >= 1900 && y <= 9999) update((s) => { s.year = y; });
      else e.target.value = state.year;
    });
    $('lang').addEventListener('change', (e) => {
      state.lang = e.target.value;
      replaceState(state);
    });
    $('showWeekNumbers').addEventListener('change', (e) => update((s) => { s.showWeekNumbers = e.target.checked; }));
    $('showLegend').addEventListener('change', (e) => update((s) => { s.showLegend = e.target.checked; }));
  }

  // ---------- categories ----------

  function renderCategoryList() {
    const ul = $('categoryList');
    ul.replaceChildren();
    if (!state.categories.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = t('noCategories');
      ul.appendChild(li);
      return;
    }
    state.categories.forEach((cat, i) => {
      const li = document.createElement('li');
      li.className = 'cat-row';

      const color = document.createElement('input');
      color.type = 'color';
      color.value = cat.color;
      color.addEventListener('change', () => update((s) => { s.categories[i].color = color.value; }));

      const name = document.createElement('input');
      name.type = 'text';
      name.value = cat.name;
      name.maxLength = 40;
      name.addEventListener('change', () => update((s) => { s.categories[i].name = name.value.trim() || t('untitled'); }));

      const order = document.createElement('div');
      order.className = 'order';
      const up = iconButton('▲', t('moveUp'), () => update((s) => {
        [s.categories[i - 1], s.categories[i]] = [s.categories[i], s.categories[i - 1]];
      }));
      up.disabled = i === 0;
      const down = iconButton('▼', t('moveDown'), () => update((s) => {
        [s.categories[i + 1], s.categories[i]] = [s.categories[i], s.categories[i + 1]];
      }));
      down.disabled = i === state.categories.length - 1;
      order.append(up, down);

      const del = iconButton('✕', t('delete'), () => {
        const hasEvents = state.events.some((e) => e.categoryId === cat.id);
        if (hasEvents && !confirm(t('confirmDeleteCategory'))) return;
        if (editingId && state.events.find((e) => e.id === editingId && e.categoryId === cat.id)) cancelEdit();
        update((s) => {
          s.categories.splice(i, 1);
          s.events = s.events.filter((e) => e.categoryId !== cat.id);
        });
      });

      li.append(color, name, order, del);
      ul.appendChild(li);
    });
  }

  function iconButton(symbol, title, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon';
    b.textContent = symbol;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', onClick);
    return b;
  }

  function bindCategoryForm() {
    $('categoryForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('newCategoryName').value.trim();
      if (!name) return;
      const color = $('newCategoryColor').value;
      update((s) => { s.categories.push({ id: Store.uid(), name, color }); });
      $('newCategoryName').value = '';
      $('newCategoryColor').value = PALETTE[state.categories.length % PALETTE.length];
      // Pre-select the new category for the next activity.
      $('eventCategory').value = state.categories[state.categories.length - 1].id;
    });
  }

  // ---------- events ----------

  function setOptions(select, options, keep) {
    const prev = keep ? select.value : null;
    select.replaceChildren();
    for (const o of options) {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      select.appendChild(opt);
    }
    if (prev != null && [...select.options].some((o) => o.value === prev)) select.value = prev;
  }

  function buildSelects() {
    setOptions($('fieldMonth'), Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: I18n.monthName(i + 1) })), true);
    setOptions($('fieldWeekday'), Array.from({ length: 7 }, (_, i) => ({ value: i, label: I18n.weekdayName(i) })), true);
    setOptions($('fieldMonthInQuarter'), [1, 2, 3].map((n) => ({ value: n, label: t(['firstMonth', 'secondMonth', 'thirdMonth'][n - 1]) })), true);
    const days = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
    days.push({ value: 'last', label: t('lastDay') });
    setOptions($('fieldDay'), days, true);
  }

  function renderCategoryOptions() {
    setOptions($('eventCategory'), state.categories.map((c) => ({ value: c.id, label: c.name })), true);
  }

  function syncEventForm() {
    const type = $('eventType').value;
    document.querySelectorAll('#eventForm .field').forEach((f) => {
      f.hidden = !f.getAttribute('data-types').split(' ').includes(type);
    });
    const daySelect = $('fieldDay');
    const lastOpt = [...daySelect.options].find((o) => o.value === 'last');
    if (lastOpt) {
      lastOpt.hidden = type !== 'monthly';
      if (lastOpt.hidden && daySelect.value === 'last') daySelect.value = '1';
    }
    $('eventSubmit').textContent = t(editingId ? 'saveEvent' : 'addEvent');
    $('eventCancel').hidden = !editingId;
    $('eventSubmit').disabled = !state.categories.length;
  }

  function readRecurrence(type) {
    switch (type) {
      case 'yearly':
        return { type, month: Number($('fieldMonth').value), day: Number($('fieldDay').value) };
      case 'quarterly':
        return { type, monthInQuarter: Number($('fieldMonthInQuarter').value), day: Number($('fieldDay').value) };
      case 'monthly': {
        const d = $('fieldDay').value;
        return { type, day: d === 'last' ? 'last' : Number(d) };
      }
      case 'weekly':
        return { type, weekday: Number($('fieldWeekday').value) };
      default:
        return null;
    }
  }

  function fillForm(ev) {
    $('eventTitle').value = ev.title;
    $('eventCategory').value = ev.categoryId;
    $('eventType').value = ev.recurrence.type;
    const r = ev.recurrence;
    if (r.type === 'yearly') { $('fieldMonth').value = r.month; $('fieldDay').value = r.day; }
    if (r.type === 'quarterly') { $('fieldMonthInQuarter').value = r.monthInQuarter; $('fieldDay').value = r.day; }
    if (r.type === 'monthly') { $('fieldDay').value = r.day; }
    if (r.type === 'weekly') { $('fieldWeekday').value = r.weekday; }
  }

  function startEdit(ev) {
    editingId = ev.id;
    fillForm(ev);
    syncEventForm();
    $('eventTitle').focus();
  }

  function cancelEdit() {
    editingId = null;
    $('eventTitle').value = '';
    syncEventForm();
  }

  function bindEventForm() {
    $('eventType').addEventListener('change', syncEventForm);
    $('eventCancel').addEventListener('click', cancelEdit);
    $('eventForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!state.categories.length) { message(t('needCategory'), true); return; }
      const title = $('eventTitle').value.trim() || t('untitled');
      const categoryId = $('eventCategory').value;
      const recurrence = readRecurrence($('eventType').value);
      if (!recurrence) return;
      const id = editingId;
      update((s) => {
        if (id) {
          const ev = s.events.find((x) => x.id === id);
          if (ev) Object.assign(ev, { title, categoryId, recurrence });
        } else {
          s.events.push({ id: Store.uid(), title, categoryId, recurrence });
        }
      });
      cancelEdit();
    });
  }

  function renderEventList() {
    const host = $('eventList');
    host.replaceChildren();
    if (!state.events.length) {
      const p = document.createElement('div');
      p.className = 'empty';
      p.textContent = t('noEvents');
      host.appendChild(p);
      return;
    }
    for (const cat of state.categories) {
      const evs = state.events.filter((e) => e.categoryId === cat.id);
      if (!evs.length) continue;
      const group = document.createElement('div');
      group.className = 'ev-group';
      const h = document.createElement('h3');
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = cat.color;
      h.append(sw, document.createTextNode(cat.name));
      group.appendChild(h);
      for (const ev of evs) {
        const row = document.createElement('div');
        row.className = 'ev-row';
        const text = document.createElement('div');
        text.className = 'ev-text';
        const title = document.createElement('span');
        title.className = 'ev-title';
        title.textContent = ev.title;
        const sub = document.createElement('span');
        sub.className = 'ev-sub';
        sub.textContent = I18n.describeRecurrence(ev.recurrence);
        text.append(title, sub);
        const edit = iconButton('✎', t('edit'), () => startEdit(ev));
        const del = iconButton('✕', t('delete'), () => {
          if (editingId === ev.id) cancelEdit();
          update((s) => { s.events = s.events.filter((x) => x.id !== ev.id); });
        });
        row.append(text, edit, del);
        group.appendChild(row);
      }
      host.appendChild(group);
    }
  }

  // ---------- data buttons ----------

  function exampleState() {
    const nb = state.lang === 'nb';
    const x = (no, en) => (nb ? no : en);
    const hr = { id: Store.uid(), name: t('exampleHR'), color: PALETTE[0] };
    const fin = { id: Store.uid(), name: t('exampleFinance'), color: PALETTE[1] };
    const mkt = { id: Store.uid(), name: t('exampleMarketing'), color: PALETTE[2] };
    const ops = { id: Store.uid(), name: t('exampleOps'), color: PALETTE[3] };
    const ev = (cat, title, recurrence) => ({ id: Store.uid(), title, categoryId: cat.id, recurrence });
    return {
      version: 1,
      year: state.year,
      lang: state.lang,
      title: x('Årshjul', 'Year wheel'),
      showWeekNumbers: true,
      showLegend: true,
      categories: [hr, fin, mkt, ops],
      events: [
        ev(hr, x('Medarbeidersamtaler', 'Performance reviews'), { type: 'yearly', month: 2, day: 15 }),
        ev(hr, x('Allmøte', 'All-hands'), { type: 'quarterly', monthInQuarter: 1, day: 10 }),
        ev(hr, x('Sommerfest', 'Summer party'), { type: 'yearly', month: 6, day: 20 }),
        ev(fin, x('Månedsavslutning', 'Month-end close'), { type: 'monthly', day: 'last' }),
        ev(fin, x('Kvartalsrapport', 'Quarterly report'), { type: 'quarterly', monthInQuarter: 1, day: 20 }),
        ev(fin, x('Budsjett', 'Budget'), { type: 'yearly', month: 11, day: 1 }),
        ev(mkt, x('Sommerkampanje', 'Summer campaign'), { type: 'yearly', month: 6, day: 1 }),
        ev(mkt, x('Julekampanje', 'Christmas campaign'), { type: 'yearly', month: 11, day: 20 }),
        ev(mkt, x('Nyhetsbrev', 'Newsletter'), { type: 'weekly', weekday: 3 }),
        ev(ops, x('Driftsmøte', 'Ops meeting'), { type: 'weekly', weekday: 0 }),
        ev(ops, x('Beredskapsøvelse', 'Emergency drill'), { type: 'yearly', month: 9, day: 15 }),
      ],
    };
  }

  function bindDataButtons() {
    $('loadExampleBtn').addEventListener('click', () => {
      const hasData = state.categories.length || state.events.length;
      if (hasData && !confirm(t('confirmLoadExample'))) return;
      cancelEdit();
      replaceState(exampleState());
    });
    $('clearBtn').addEventListener('click', () => {
      if (!confirm(t('confirmClear'))) return;
      cancelEdit();
      update((s) => { s.categories = []; s.events = []; });
      syncSettings();
    });
    $('exportJsonBtn').addEventListener('click', () => Store.exportJSON(state));
    $('importJson').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const next = await Store.importJSON(file);
        cancelEdit();
        replaceState(next);
        message(t('importOk'));
      } catch (err) {
        message(t('importError') + (err && err.message ? err.message : String(err)), true);
      }
    });
    $('downloadSvgBtn').addEventListener('click', () => {
      Exporter.downloadSvg($('wheel').querySelector('svg'), `yearwheel-${state.year}.svg`);
    });
    $('downloadPngBtn').addEventListener('click', () => {
      Exporter.downloadPng($('wheel').querySelector('svg'), `yearwheel-${state.year}.png`, 3)
        .catch((err) => message(String(err.message || err), true));
    });
  }

  // ---------- init ----------

  function init() {
    I18n.setLang(state.lang);
    document.documentElement.lang = state.lang;
    I18n.applyTranslations();
    buildSelects();
    syncSettings();
    bindSettings();
    bindCategoryForm();
    bindEventForm();
    bindDataButtons();
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
