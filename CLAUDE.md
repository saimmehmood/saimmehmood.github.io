# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Saim Mehmood's personal resume site (https://saimmehmood.github.io/), published by GitHub Pages from `master`. It is a Jekyll site that started as a fork of [sproogen/modern-resume-theme](https://github.com/sproogen/modern-resume-theme) and has since been redesigned as a tile-based portfolio with its own templates, plain CSS and vanilla JS (no theme, no build step beyond Jekyll).

## Commands

Local development uses `Gemfile.local` (Jekyll 4, Ruby 3.2.2 per `.ruby-version`), not the default `Gemfile`:

```sh
BUNDLE_GEMFILE=Gemfile.local bundle install
BUNDLE_GEMFILE=Gemfile.local bundle exec jekyll serve --livereload   # http://localhost:4000
BUNDLE_GEMFILE=Gemfile.local bundle exec jekyll build                # output in _site/
```

Ruby 3.2.2 comes from rbenv. If `bundle` resolves to macOS's system Ruby 2.6 (the non-interactive shell doesn't load rbenv), prefix commands with `PATH="$HOME/.rbenv/shims:$PATH"`.

There is no test suite or linter. Verify changes by building and viewing the page, in both light and dark mode and at phone width. The default `Gemfile`/`gemspec`/`Dockerfile`/`scripts/` are upstream theme leftovers (github-pages gem, Jekyll 3.8, Ruby 2.x, Travis release scripts) and are not part of the local workflow.

**Compatibility:** GitHub Pages builds with its own pinned Jekyll 3.x (the `github-pages` gem), while local dev runs Jekyll 4. Avoid Liquid filters/features that exist only in Jekyll 4, and stick to the `jekyll-seo-tag` plugin (the only one enabled). Styles are plain CSS in `assets/css/site.css` rather than Sass so both Jekyll versions output identical CSS. To reproduce the Pages build, install the `github-pages` gem in a separate Gemfile and build with `PAGES_REPO_NWO=saimmehmood/saimmehmood.github.io JEKYLL_ENV=production bundle exec jekyll build --safe`; the env var is needed because the `origin` remote uses an SSH host alias.

## Architecture

The site is a single page: `index.md` → `_layouts/default.html`, which includes one partial per section in this order: `nav`, `hero` (hero, stat tiles and the About bento), `work`, `projects`, `research`, `skills`, `education` (also certifications, awards, community), `connect`, `footer`. Content lives in data files, not templates:

- **`_config.yml`**: name, `title` (split on `|` into the hero's role pills), `hero_kicker`, `hero_tagline`, `location`, `about_content` (Markdown), social usernames, `stackoverflow_id`.
- **`_data/experience.yml`**: one entry per role, newest first. Besides `company`/`job_title`/`dates`/`link`/`description`, each role has `short` (timeline label and monogram source), `area` (keys from `_data/areas.yml`, which drive the filter chips and tile colour; a role with `research` or `teaching` goes in the timeline's Research & Teaching row, otherwise Industry), `tags` (skill chips), and optional `mono` (explicit monogram text) or `logo` (Font Awesome class, e.g. `fa-brands fa-apple`).
- **Other data files**: `projects` (`kind`, `icon`, `stack`), `education` (`short`), `certifications`, `volunteer`, `publications`, `writing` (Medium posts and Stack Overflow answers), `skills` (`groups` + `interests`), `awards`, `profiles`, `highlights` (hero stat counters), `areas`.
- **Tile summaries** come from `_includes/summary.html`: the first `•` bullet (or paragraph) of a `description`, as plain text. Each Work/Education tile also embeds the full description in a `<template class="detail-tpl">`, which `index.js` clones into the shared `<dialog id="detail">` when a tile or timeline bar is clicked.
- **`assets/js/index.js`** (no dependencies) parses each tile's `data-dates` to compute durations and draw the career timeline (recent years are stretched on purpose), and handles filters, scroll reveal, counters, theme toggle (persisted in `localStorage`), email de-obfuscation (`site.email` stays in `(dot)`/`(at)` form in the HTML), and live stats from the public GitHub and Stack Exchange APIs (cached in `sessionStorage`; the static content still renders if they fail).
- **External assets**: Google Fonts (Inter, Space Grotesk, JetBrains Mono) and Font Awesome 6 from cdnjs. Check that an icon name exists in FA 6 free before using it.
- Analytics includes (`gtm`, `gtag`, `google_analytics`) render only when `JEKYLL_ENV=production` and the matching config key is set.

## Content conventions

- In `_data/experience.yml`, entries are listed newest first. Bullets inside `description: |` use a literal `•` character with blank lines between them, so each renders as its own paragraph.
- Dates are free-text strings shown exactly as written, but keep them in a `Mon YYYY - Mon YYYY` / `Mon YYYY - Present` shape so the timeline and duration badges can parse them.
- `.gitignore` lists `Gemfile.local*`, `.ruby-version`, and `.DS_Store`, but those files are still tracked. `.sass-cache/` is tracked too (left over from the old Sass theme). Don't commit churn in these files unless asked.
