# hexo-theme-chunqiu

A Hexo theme for “chronicle / events” sites:

- Home: chronological wheel (sorted by date, newest → oldest)
- Post page: hero + related events + TOC
- Calendar page: browse events by year/month
- Relations page: centered sub-graph for a given event (drag nodes, click to navigate)
- Single-language build: pick one build language via theme config (no runtime language switch)

> Note: the theme embeds the event index into HTML at build time (`window.__CHUNQIU__.events`) to avoid `fetch` issues under `file://` or certain hosting setups.

---

## 1. Install & enable

In your Hexo site root (e.g. `Hexo-demo/`):

1) Clone the theme into `themes/`:

```bash
git clone <theme-repo-url> themes/hexo-theme-chunqiu
```

> If you already placed the folder manually, ensure the path is `themes/hexo-theme-chunqiu/`.

2) Enable the theme in site `_config.yml`:

```yml
theme: hexo-theme-chunqiu
```

3) Install dependencies and start:

```bash
npm install
npx hexo clean
npx hexo generate
npx hexo server
```

---

## 2. Theme config (`themes/hexo-theme-chunqiu/_config.yml`)

```yml
# Single-language build: choose the build output language.
# Supported: zh-CN | zh-TW | en | de
build_language: zh-CN

# Home page item limit (0 means all)
home_limit: 0

# Theme primary color (buttons, accents, center node, etc.)
# Prefer 6-digit hex (3-digit also works)
primary_color: "#f0721a"

# Optional hover color
primary_hover_color: "#e15810"

# Show tags
show_tags: true

# Show the `era` badge
show_era: true
```

### 2.1 Build language (`build_language`)

- The theme applies the selected language at build time via `themes/hexo-theme-chunqiu/scripts/set-language.js`.
- Result: the `__()` i18n helper in EJS templates outputs strings in the selected language.
- This is a single-language build: each build produces one language variant.

Tips:

- After changing `build_language`, re-generate the site: `npx hexo clean && npx hexo generate`.
- If you preview locally with `npx hexo server`, restart the server to avoid stale output.

### 2.2 Primary color (`primary_color` / `primary_hover_color`)

The theme injects CSS variables:

- `--primary`
- `--primary-hover`
- `--primary-rgb` (for `rgba()` use cases)

---

## 3. Event post front-matter

Published posts are treated as “events” if they provide date fields:

- `event_year` (required, number)
- `event_month` (required, 1-12)
- `event_day` (required, 1-31)

If any of these are missing, the post will not be included in chronicle/calendar/relations indexes.

### 3.1 Minimal template

```md
---
title: "2020: Example event"
date: 2020-01-02 00:00:00
updated: 2020-01-02 00:00:00
categories:
  - Chronicle
summary: "One-line summary (optional but recommended)."

event_year: 2020
event_month: 1
event_day: 2

# Optional
era: Modern

# Optional relations
relations:
  - to: "2019-12-31-some-event"
    type: "related"
---

Content...
```

### 3.2 Event ID (`event_id`) and how relations resolve

The theme derives each event `id` using the following priority:

1. `event_id` (explicit)
2. `slug`
3. Markdown filename (without extension)
4. `post.path`

Recommended:

- Set `event_id` for every event and keep it stable.
- Or use the filename (without `.md`) as `event_id`.

### 3.3 `relations` format

**Format A (recommended, with type):**

```yml
relations:
  - to: "2008-09-15-global-financial-crisis-lehman"
    type: "context"
```

**Format B (shorthand):**

```yml
relations:
  - "2008-09-15-global-financial-crisis-lehman"
  - "2020-03-11-covid-19-pandemic-declared"
```

- `to` is the target event ID (resolved by the rules above).
- `type` is mostly informational; the theme does not heavily depend on it.

### 3.4 Sorting

Chronicle/index sorting is always newest → oldest (descending):

1) year (desc)
2) month (desc)
3) day (desc)

---

## 4. Images & video

### 4.1 Images

Recommended: put images under `source/images/`:

- File: `source/images/example.jpg`
- Use:

```md
![caption](/images/example.jpg)
```

The theme applies responsive styling: `img/video/iframe` default to `max-width: 100%`.

### 4.2 Video

You can embed an iframe (e.g. YouTube nocookie):

```html
<iframe
  width="100%"
  height="360"
  style="border:0;border-radius:12px;"
  src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
  title="Video"
  loading="lazy"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
></iframe>
```

> Some platforms may block embeds via CSP; that is outside the theme.

---

## 5. Pages & usage

Core routes:

- Home: `/` (chronicle wheel)
- Calendar: `/calendar/`
- Relations: `/relations/`

### 5.1 Relations graph (centered on an event)

The “Relations” button on a post page links to:

- `/relations/?event=<EVENT_ID>`

The graph:

- centers on the given event
- shows a related sub-graph
- supports drag + inertia
- navigates to the event page when clicking a node

Depth limit:

- The chained expansion is capped in frontend code to keep the graph manageable.
- Current default: `MAX_DEPTH = 3` in `source/js/chunqiu-relations.js`.

---

## 6. Common commands

Run in site root:

```bash
npx hexo clean
npx hexo generate
npx hexo server
```

---

## 7. FAQ

### 7.1 My post doesn’t appear on home/calendar/relations

Check front-matter:

- `event_year/event_month/event_day` exist and are numbers
- not `published: false`

### 7.2 I wrote relations but the target event is missing

- Ensure `relations.to` matches the target event ID (prefer consistent `event_id`)
- Ensure the target post also has `event_year/event_month/event_day` (otherwise it won’t be indexed)

### 7.3 Some features don’t work when opening `public/*.html` via `file://`

- The event index is embedded, so it does not rely on `fetch`.
- But external iframes depend on browser/site policies; prefer `npx hexo server`.

### 7.4 `build_language: en` but UI is still Chinese

Most likely you’re seeing stale build output. Checklist:

- Confirm you changed `themes/hexo-theme-chunqiu/_config.yml`.
- Run `npx hexo clean && npx hexo generate`, then restart `npx hexo server`.
- Confirm the theme is enabled in site `_config.yml`: `theme: hexo-theme-chunqiu`.
- Confirm `themes/hexo-theme-chunqiu/languages/en.yml` exists.

### 7.5 PowerShell shows Exit Code = 1 for `npx hexo server`

If logs say the server is running and prints `http://localhost:4000/`, but PowerShell still reports exit code 1, it can be a terminal/process control quirk. Use actual browser access as the source of truth.

---

## 8. Development notes (theme structure)

- `layout/`: EJS templates
- `source/css/style.css`: theme styles
- `source/js/`: frontend scripts (chronicle/calendar/relations/post)
- `languages/`: i18n strings (selected by `build_language`)
- `scripts/set-language.js`: build-time language application

---

## License

Follow the repository root LICENSE.
