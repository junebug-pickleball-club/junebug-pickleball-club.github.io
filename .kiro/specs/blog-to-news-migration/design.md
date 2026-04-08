# Design Document

## Overview

This feature migrates the standalone `/blog/` page into a "News" section on the home page, adds a `/news/` archive page for browsing all posts, and removes the blog page and its nav link. Post cards reuse the existing `.event-card` styling. No new CSS classes or layouts are introduced.

## Architecture

The change touches four files and adds two new ones:

```
index.markdown              # Add News section (Liquid block)
pages/blog.html             # DELETE
pages/news.html             # NEW — News_Archive_Page at /news/
_includes/news-card.html    # NEW — Post_Card partial (reuses .event-card)
_includes/header.html       # Remove Blog nav link
```

No new Jekyll layouts are needed. The archive page uses `layout: page`.

## Component Design

### `_includes/news-card.html` (new)

A reusable partial that renders a single Post as a Post_Card. Accepts a `post` parameter.

```html
<div class="event-card">
  <h3 class="event-card__name"><a href="{{ include.post.url }}">{{ include.post.title }}</a></h3>
  <p class="event-card__date">{{ include.post.date | date: "%B %-d, %Y" }}</p>
  {% if include.post.excerpt %}
    <p class="event-card__description">{{ include.post.excerpt | strip_html | truncatewords: 40 }}</p>
  {% endif %}
</div>
```

Mirrors the field structure of `_includes/event-card.html` (`__name`, `__date`, `__description`) so the card renders consistently with event cards.

### `index.markdown` — News Section

Append a News section after the existing hero `<div>`. The section caps display at 5 posts and conditionally renders a "View all" link to `/news/`.

```liquid
<section class="news-section">
  <h2>News</h2>
  {% if site.posts.size > 0 %}
    {% for post in site.posts limit:5 %}
      {% include news-card.html post=post %}
    {% endfor %}
    {% if site.posts.size > 5 %}
      <a href="/news/">View all news &rarr;</a>
    {% endif %}
  {% else %}
    <p>No news yet.</p>
  {% endif %}
</section>
```

`site.posts` is already sorted newest-first by Jekyll, so no explicit sort is needed.

### `pages/news.html` (new)

A standard `layout: page` file at `/news/` that lists all posts.

```yaml
---
layout: page
title: News
permalink: /news/
---
```

```liquid
{% if site.posts.size > 0 %}
  {% for post in site.posts %}
    {% include news-card.html post=post %}
  {% endfor %}
{% else %}
  <p>No news yet.</p>
{% endif %}
```

No nav link is added for this page — it is reachable only via the "View all" link on the home page.

### `_includes/header.html` — Remove Blog link

Remove the single line:

```html
<a class="nav-link{% if page.url contains '/blog' %} active{% endif %}" href="/blog">Blog</a>
```

No replacement is added. The `/news/` archive page is intentionally excluded from the primary navigation.

### `pages/blog.html` — Delete

The file is removed from the source tree. Jekyll will no longer generate `/blog/`.

## Data Flow

```
_posts/*.markdown
      │
      ▼
  site.posts (Jekyll, newest-first)
      │
      ├─► index.markdown  →  News_Section (up to 5 cards + optional "View all" link)
      │
      └─► pages/news.html →  News_Archive_Page (all cards)
```

Both consumers use `{% include news-card.html post=post %}` so card markup is defined once.

## Correctness Properties

1. WHEN `site.posts.size <= 5`, the home page News section SHALL NOT render a "View all" link.
2. WHEN `site.posts.size > 5`, the home page News section SHALL render exactly 5 cards and a link to `/news/`.
3. FOR ALL posts, the post title link in a Post_Card SHALL resolve to the post's canonical URL.
4. THE News_Archive_Page SHALL render the same number of cards as `site.posts.size`.
