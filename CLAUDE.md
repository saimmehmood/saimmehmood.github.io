# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Saim Mehmood's personal resume site (https://saimmehmood.github.io/), published by GitHub Pages from `master`. It is a Jekyll site forked from [sproogen/modern-resume-theme](https://github.com/sproogen/modern-resume-theme); the theme source (`_layouts`, `_includes`, `_sass`, `assets`) is vendored in-repo and customized, not pulled in as a remote theme.

## Commands

Local development uses `Gemfile.local` (Jekyll 4, Ruby 3.2.2 per `.ruby-version`), not the default `Gemfile`:

```sh
BUNDLE_GEMFILE=Gemfile.local bundle install
BUNDLE_GEMFILE=Gemfile.local bundle exec jekyll serve --livereload   # http://localhost:4000
BUNDLE_GEMFILE=Gemfile.local bundle exec jekyll build                # output in _site/
```

Ruby 3.2.2 comes from rbenv. If `bundle` resolves to macOS's system Ruby 2.6 (the non-interactive shell doesn't load rbenv), prefix commands with `PATH="$HOME/.rbenv/shims:$PATH"`.

Render with the theme's sample data (exercises every field/section) via `--config _test/_config.yml`.

There is no test suite or linter. Verify changes by building and viewing the page. The default `Gemfile`/`gemspec`/`Dockerfile`/`scripts/` are upstream theme leftovers (github-pages gem, Jekyll 3.8, Ruby 2.x, Travis release scripts) and are not part of the local workflow.

**Compatibility:** GitHub Pages builds with its own pinned Jekyll 3.x, while local dev runs Jekyll 4. Avoid Liquid filters/features that exist only in Jekyll 4, and stick to the `jekyll-seo-tag` plugin (the only one enabled).

## Architecture

The site is a single page: `index.md` → `_layouts/default.html`, which includes each section in order, and only when that section has data:

- **`_config.yml`**: name, title (the headline tagline), social usernames, and the long-form `about_content` and `more_content` (Honors and Awards) blocks, written as Markdown in YAML block scalars. Most bio and skills edits happen here.
- **`_data/*.yml`**: `experience`, `projects`, `education`, `certifications`, `volunteer`. Each is a list of entries. A section is hidden when its file is empty.
- **`_includes/<section>.html`**: loops over `site.data.<section>` and renders each entry through `_includes/left.html` or `right.html`, picked by the entry's `layout:` field (default `left`). Those two templates hold the entry schema: `company`/`name`, `job_title`/`qualification`, `dates`, `link`, `github`, `quote`, `jobs[]` (multiple titles under one company), and `description` (Markdown, rendered with `markdownify`).
- **Styling**: `assets/main.scss` imports `_sass/modern-resume-theme.scss`, which pulls in the other partials. Dark mode comes from `_sass/dark.scss` (a `.dark` body class), set either by `darkmode: true` in config or at runtime by `assets/js/index.js` when the OS prefers dark.
- Analytics includes (`gtm`, `gtag`, `google_analytics`) render only when `JEKYLL_ENV=production` and the matching config key is set.

## Content conventions

- In `_data/experience.yml`, entries are listed newest first. Bullets inside `description: |` use a literal `•` character with blank lines between them, so each renders as its own paragraph.
- Dates are free-text strings (e.g. `Jan 2026 - April 2026`), shown exactly as written.
- `.gitignore` lists `Gemfile.local*`, `.ruby-version`, and `.DS_Store`, but those files are still tracked. `.sass-cache/` is tracked too. Don't commit churn in these files unless asked.
