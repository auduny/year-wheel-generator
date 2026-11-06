# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

A static, single-page year wheel ("årshjul") generator: a circular calendar
where recurring activities (yearly, quarterly, monthly, weekly, daily) are drawn on
colored category rings. Plain HTML/CSS/JS, no build step, no dependencies, no
server. See `README.md` for features and the JSON data format.

## Running and testing

- Run: open `index.html` in a browser.
- Test: `node --test test/recurrence.test.js` (node's built-in runner, no packages).
- Do not add a `package.json`, bundler, framework, or npm dependencies unless asked.

## Architecture

Each file in `js/` is a classic script (not an ES module) wrapped in an IIFE
that attaches one global namespace. They are loaded in this order by
`index.html`, and later files depend on earlier globals:

| File | Global | Role |
| --- | --- | --- |
| `js/recurrence.js` | `Recurrence` | Pure date logic: expand recurrence rules to dates, angles, ISO weeks |
| `js/i18n.js` | `I18n` | `nb`/`en` strings, `Intl`-based month/weekday names, `data-i18n` binding |
| `js/render.js` | `Render` | Builds the wheel as a self-contained SVG string from state |
| `js/export.js` | `Exporter` | SVG and PNG download |
| `js/storage.js` | `Store` | localStorage, JSON import/export, `normalize()` validation |
| `js/app.js` | — | State, forms, lists; all mutations go through `update(fn)` |

Data flow: `app.js` holds `state` → `update()` saves via `Store.save` and calls
`renderAll()` → `Render.buildSvg(state)`.

## Conventions

- Keep `js/recurrence.js` free of DOM access. It is shared with node via the
  `module.exports` fallback at the bottom; `i18n.js` uses the same pattern.
- Build dates in UTC (`Date.UTC`) to avoid DST issues. Weekdays are 0 = Monday.
- Days past a month's end clamp to the last day; `"last"` is valid for monthly.
- UI text lives in `js/i18n.js`. Add every new key to **both** `nb` and `en`,
  and use `data-i18n`, `data-i18n-placeholder`, or `data-i18n-title` in HTML
  rather than hardcoded strings.
- The SVG from `render.js` must stay self-contained (inline styles, no external
  refs) so SVG/PNG export works.
- The saved/exported format is `version: 1`. If you change its shape, update
  `Store.normalize()`, the README's JSON section, and keep old files loadable.
- Style: `'use strict'`, 2-space indent, single quotes, semicolons, short
  section comments like `// ---------- state ----------`.

## Before finishing a change

- Run the tests; add cases to `test/recurrence.test.js` for any date-logic change.
- For UI changes, check the page in a browser in both languages and try an
  SVG/PNG export.
