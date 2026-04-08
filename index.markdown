---
layout: default
title: Junebug Pickleball Club
---

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
