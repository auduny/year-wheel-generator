/* UI translations. Month and weekday names come from Intl so nothing is hardcoded. */
(function (root) {
  'use strict';

  const LOCALES = { nb: 'nb-NO', en: 'en-GB' };

  const I18N = {
    nb: {
      appTitle: 'Årshjul-generator',
      settings: 'Innstillinger',
      wheelTitle: 'Tittel',
      year: 'År',
      language: 'Språk',
      showWeekNumbers: 'Vis ukenummer',
      showLegend: 'Vis forklaring',
      categories: 'Kategorier',
      categoryName: 'Kategorinavn',
      addCategory: 'Legg til kategori',
      noCategories: 'Ingen kategorier ennå. Legg til en for å begynne.',
      moveUp: 'Flytt utover',
      moveDown: 'Flytt innover',
      delete: 'Slett',
      edit: 'Rediger',
      events: 'Aktiviteter',
      eventTitle: 'Navn',
      category: 'Kategori',
      recurrence: 'Gjentakelse',
      typeYearly: 'Fast dato hvert år',
      typeQuarterly: 'Hvert kvartal',
      typeMonthly: 'Hver måned',
      typeWeekly: 'Hver uke',
      typeDaily: 'Hver dag',
      month: 'Måned',
      day: 'Dag',
      lastDay: 'Siste dag',
      monthInQuarter: 'Måned i kvartalet',
      firstMonth: '1. måned',
      secondMonth: '2. måned',
      thirdMonth: '3. måned',
      weekday: 'Ukedag',
      seasonFrom: 'Fra måned',
      seasonTo: 'Til måned',
      allYear: 'Hele året',
      addEvent: 'Legg til aktivitet',
      saveEvent: 'Lagre endringer',
      cancel: 'Avbryt',
      noEvents: 'Ingen aktiviteter ennå.',
      needCategory: 'Opprett en kategori først.',
      data: 'Data',
      loadExample: 'Last inn eksempel',
      exportJson: 'Eksporter JSON',
      importJson: 'Importer JSON',
      downloadSvg: 'Last ned SVG',
      downloadPng: 'Last ned PNG',
      clearAll: 'Tøm alt',
      confirmDeleteCategory: 'Slette kategorien og alle aktivitetene i den?',
      confirmLoadExample: 'Erstatte det du har nå med eksempelet?',
      confirmClear: 'Fjerne alle kategorier og aktiviteter?',
      importError: 'Kunne ikke importere filen: ',
      importOk: 'Importert.',
      quarter: 'K',
      legend: 'Forklaring',
      boxYearly: 'Årlig',
      boxQuarterly: 'Kvartalsvis',
      boxMonthly: 'Månedlig',
      boxWeekly: 'Ukentlig',
      boxDaily: 'Daglig',
      moreItems: '+{n} til',
      week: 'Uke',
      untitled: 'Uten navn',
      defaultTitle: 'Årshjul',
      exampleHR: 'HR',
      exampleFinance: 'Økonomi',
      exampleMarketing: 'Marked',
      exampleOps: 'Drift',
    },
    en: {
      appTitle: 'Year Wheel Generator',
      settings: 'Settings',
      wheelTitle: 'Title',
      year: 'Year',
      language: 'Language',
      showWeekNumbers: 'Show week numbers',
      showLegend: 'Show legend',
      categories: 'Categories',
      categoryName: 'Category name',
      addCategory: 'Add category',
      noCategories: 'No categories yet. Add one to get started.',
      moveUp: 'Move outward',
      moveDown: 'Move inward',
      delete: 'Delete',
      edit: 'Edit',
      events: 'Activities',
      eventTitle: 'Name',
      category: 'Category',
      recurrence: 'Recurrence',
      typeYearly: 'Fixed date every year',
      typeQuarterly: 'Every quarter',
      typeMonthly: 'Every month',
      typeWeekly: 'Every week',
      typeDaily: 'Every day',
      month: 'Month',
      day: 'Day',
      lastDay: 'Last day',
      monthInQuarter: 'Month of the quarter',
      firstMonth: '1st month',
      secondMonth: '2nd month',
      thirdMonth: '3rd month',
      weekday: 'Weekday',
      seasonFrom: 'From month',
      seasonTo: 'To month',
      allYear: 'All year',
      addEvent: 'Add activity',
      saveEvent: 'Save changes',
      cancel: 'Cancel',
      noEvents: 'No activities yet.',
      needCategory: 'Create a category first.',
      data: 'Data',
      loadExample: 'Load example',
      exportJson: 'Export JSON',
      importJson: 'Import JSON',
      downloadSvg: 'Download SVG',
      downloadPng: 'Download PNG',
      clearAll: 'Clear all',
      confirmDeleteCategory: 'Delete this category and all its activities?',
      confirmLoadExample: 'Replace what you have now with the example?',
      confirmClear: 'Remove all categories and activities?',
      importError: 'Could not import the file: ',
      importOk: 'Imported.',
      quarter: 'Q',
      legend: 'Legend',
      boxYearly: 'Yearly',
      boxQuarterly: 'Quarterly',
      boxMonthly: 'Monthly',
      boxWeekly: 'Weekly',
      boxDaily: 'Daily',
      moreItems: '+{n} more',
      week: 'Week',
      untitled: 'Untitled',
      defaultTitle: 'Year wheel',
      exampleHR: 'HR',
      exampleFinance: 'Finance',
      exampleMarketing: 'Marketing',
      exampleOps: 'Operations',
    },
  };

  let current = 'nb';

  function setLang(lang) {
    current = I18N[lang] ? lang : 'nb';
  }

  function getLang() {
    return current;
  }

  function t(key) {
    const table = I18N[current] || I18N.nb;
    return table[key] != null ? table[key] : (I18N.en[key] != null ? I18N.en[key] : key);
  }

  function locale() {
    return LOCALES[current] || LOCALES.nb;
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function monthName(month, style) {
    const fmt = new Intl.DateTimeFormat(locale(), { month: style || 'long', timeZone: 'UTC' });
    return capitalize(fmt.format(new Date(Date.UTC(2001, month - 1, 1))));
  }

  // weekday: 0 = Monday ... 6 = Sunday
  function weekdayName(weekday, style) {
    const fmt = new Intl.DateTimeFormat(locale(), { weekday: style || 'long', timeZone: 'UTC' });
    // 2001-01-01 was a Monday
    return capitalize(fmt.format(new Date(Date.UTC(2001, 0, 1 + weekday))));
  }

  function formatDate(date) {
    const fmt = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', timeZone: 'UTC' });
    return fmt.format(date);
  }

  function ordinalDay(day) {
    if (day === 'last') return t('lastDay').toLowerCase();
    const n = Number(day);
    if (current === 'nb') return n + '.';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // "mai–sep" / "May–Sep" for a seasonal rule, '' otherwise.
  function describeSeason(r) {
    if (!r || !r.fromMonth || !r.toMonth) return '';
    const m = (n) => {
      const s = monthName(n, 'short').replace('.', '');
      return current === 'nb' ? s.toLowerCase() : s;
    };
    return `${m(r.fromMonth)}–${m(r.toMonth)}`;
  }

  // Short human summary of a recurrence rule for the legend and event list.
  function describeRecurrence(r) {
    const base = describeRule(r);
    const season = describeSeason(r);
    return season ? `${base}, ${season}` : base;
  }

  function describeRule(r) {
    if (!r) return '';
    switch (r.type) {
      case 'yearly':
        return current === 'nb'
          ? `${ordinalDay(r.day)} ${monthName(r.month).toLowerCase()}`
          : `${ordinalDay(r.day)} of ${monthName(r.month)}`;
      case 'quarterly': {
        const names = { 1: t('firstMonth'), 2: t('secondMonth'), 3: t('thirdMonth') };
        return current === 'nb'
          ? `${ordinalDay(r.day)} i ${names[r.monthInQuarter].toLowerCase()} hvert kvartal`
          : `${ordinalDay(r.day)} of ${names[r.monthInQuarter]} each quarter`;
      }
      case 'monthly':
        return current === 'nb'
          ? `${ordinalDay(r.day)} hver måned`
          : (r.day === 'last' ? 'last day of every month' : `${ordinalDay(r.day)} of every month`);
      case 'weekly':
        return current === 'nb'
          ? `hver ${weekdayName(r.weekday).toLowerCase()}`
          : `every ${weekdayName(r.weekday)}`;
      case 'daily':
        return current === 'nb' ? 'hver dag' : 'every day';
      default:
        return '';
    }
  }

  function applyTranslations(rootEl) {
    const scope = rootEl || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
  }

  root.I18n = {
    setLang, getLang, t, locale, monthName, weekdayName, formatDate,
    describeRecurrence, describeSeason, applyTranslations, ordinalDay,
  };
})(typeof window !== 'undefined' ? window : globalThis);
