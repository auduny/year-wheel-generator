# Year Wheel Generator (årshjul)

A single-page browser tool for building a year wheel: a circular calendar where
recurring activities are placed at the time of year they happen.

- Activities recur **yearly** (fixed date), **quarterly**, **monthly**, **weekly**, or **daily**.
  Monthly, weekly and daily ones can be limited to a season, like May–September or December–March.
- Activities are grouped in **categories**, each drawn as its own colored ring.
- Four boxes around the wheel list the yearly, quarterly, monthly and weekly activities, with the exact date as secondary text.
  Daily activities get a box below the wheel, shown only when there are any.
- Norwegian and English UI, with month and weekday names from the browser's locale data.
- Auto-saves to `localStorage`, with JSON import/export for sharing and backup.
- Exports to **SVG** and **PNG** (3000 px).

## Running

Open `index.html` in a browser. No build step, no server, no dependencies.

## Tests

The date logic in `js/recurrence.js` is pure and tested with node's built-in runner:

```
node --test test/recurrence.test.js
```

## Files

| Path | Role |
| --- | --- |
| `index.html` | Page shell: sidebar with forms, wheel container |
| `css/style.css` | Layout and form styling |
| `js/recurrence.js` | Expands a recurrence rule into dates for a year, angle math, ISO weeks |
| `js/i18n.js` | UI strings in `nb` and `en`, month/weekday names via `Intl` |
| `js/render.js` | Builds the wheel as a self-contained SVG from state |
| `js/export.js` | SVG and PNG download |
| `js/storage.js` | localStorage, JSON import/export, validation |
| `js/app.js` | State, forms, lists, re-rendering |

## JSON format

```json
{
  "version": 1,
  "year": 2027,
  "lang": "nb",
  "title": "Årshjul",
  "showWeekNumbers": true,
  "showLegend": true,
  "categories": [{ "id": "…", "name": "HR", "color": "#2563eb" }],
  "events": [
    { "id": "…", "title": "Allmøte", "categoryId": "…",
      "recurrence": { "type": "quarterly", "monthInQuarter": 1, "day": 10 } }
  ]
}
```

Recurrence shapes:

- `{ "type": "yearly", "month": 1-12, "day": 1-31 }`
- `{ "type": "quarterly", "monthInQuarter": 1-3, "day": 1-31 }`
- `{ "type": "monthly", "day": 1-31 | "last" }`
- `{ "type": "weekly", "weekday": 0-6 }` where 0 is Monday
- `{ "type": "daily" }`

Monthly, weekly and daily rules can take an optional season, `"fromMonth": 1-12, "toMonth": 1-12`
(inclusive). It may wrap past New Year, e.g. `"fromMonth": 12, "toMonth": 3` for winter.

Days beyond a month's length clamp to the last day of that month.
