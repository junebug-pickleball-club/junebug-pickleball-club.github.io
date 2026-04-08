# Requirements Document

## Introduction

The Junebug Pickleball League site currently has a standalone Blog page at `/blog/` that lists all posts from `_posts/`. This feature migrates that content to the home page under a "News" section and removes the standalone blog page and its navigation link. The goal is to consolidate league news directly on the landing page so visitors see updates without navigating away.

## Glossary

- **Home_Page**: The Jekyll page rendered from `index.markdown` at the `/` route.
- **News_Section**: A new section on the Home_Page that lists the most recent posts from `_posts/`, replacing the standalone blog page.
- **News_Archive_Page**: A standalone page at `/news/` that lists all posts from `_posts/` in reverse-chronological order.
- **Post**: A Markdown file in `_posts/` with Jekyll front matter (`layout: post`, `title`, `date`).
- **Post_Card**: A UI card component styled using the `.event-card` CSS class, displaying post metadata and a link to the full post.
- **Blog_Page**: The standalone page currently at `pages/blog.html` with permalink `/blog/`.
- **Header**: The site-wide navigation partial at `_includes/header.html`.
- **Nav_Link**: An anchor element rendered inside the Header that links to a site page.

---

## Requirements

### Requirement 1: Display News Section on Home Page

**User Story:** As a site visitor, I want to see league news posts on the home page, so that I can stay up to date without navigating to a separate page.

#### Acceptance Criteria

1. THE Home_Page SHALL render a "News" section below the existing hero content.
2. WHEN `site.posts` is non-empty, THE News_Section SHALL display each Post as a Post_Card showing the post title as a link to the post's URL, the formatted publication date, and a truncated excerpt.
3. WHEN `site.posts` is empty, THE News_Section SHALL display a message indicating no news is available.
4. THE News_Section SHALL render posts in reverse-chronological order (newest first).
5. THE News_Section SHALL display at most 5 posts; WHEN more than 5 posts exist, THE News_Section SHALL include a link to the News_Archive_Page at `/news/`.
6. THE Post_Card SHALL use the `.event-card` CSS class to match the existing event card styling.

### Requirement 2: News Archive Page

**User Story:** As a site visitor, I want to view all league news posts in one place, so that I can browse older content not shown on the home page.

#### Acceptance Criteria

1. THE Site SHALL serve a News_Archive_Page at the `/news/` permalink.
2. THE News_Archive_Page SHALL display all Posts as Post_Cards in reverse-chronological order.
3. WHEN `site.posts` is empty, THE News_Archive_Page SHALL display a message indicating no news is available.
4. THE Header SHALL NOT render a Nav_Link pointing to `/news/`.

### Requirement 3: Remove Standalone Blog Page

**User Story:** As a site maintainer, I want the standalone blog page removed, so that there is a single canonical location for news content.

#### Acceptance Criteria

1. THE Site SHALL NOT serve a page at the `/blog/` permalink after this change is applied.
2. THE Site SHALL remove `pages/blog.html` from the source tree.

### Requirement 4: Remove Blog Navigation Link

**User Story:** As a site visitor, I want the navigation to reflect the current site structure, so that I am not directed to a removed page.

#### Acceptance Criteria

1. THE Header SHALL NOT render a Nav_Link pointing to `/blog/`.
2. WHEN the home page is active, THE Header SHALL continue to highlight the Home Nav_Link as active.
