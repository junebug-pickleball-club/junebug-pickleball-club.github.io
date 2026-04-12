---
layout: default
title: Junebug Pickleball Club
---

<style>
  .about-section {
    margin-bottom: 3rem;
    padding-bottom: 2.5rem;
    border-bottom: 1px solid #073642;
  }
  .about-section h2 {
    color: #b58900;
    margin-bottom: 1.25rem;
  }
  .about-body p {
    line-height: 1.75;
    margin-bottom: 1rem;
    color: #fdf6e3;
  }
  .about-closing {
    margin-top: 1.5rem;
    font-style: italic;
    color: #93a1a1 !important;
  }
  .about-welcome {
    font-size: 1.15rem;
    font-weight: 700;
    color: #b58900 !important;
    margin-top: 1rem;
  }
</style>

<section class="about-section">
  <h2>About Junebug Pickleball Club</h2>
  <div class="about-body">
    <p>It all started at The Pickleball Hideout in Montgomery, Texas, where many of us began our pickleball journey in 2023.</p>
    <p>With over a dozen of us seeing each other almost every single day, what started as casual play quickly turned into something more. Naturally, we began competing against one another, pushing each other to improve, and building friendships through the game we all fell in love with. Before long, we were not just showing up — we were coordinating times, organizing games, and creating something consistent.</p>
    <p>Then came the night that changed everything.</p>
    <p>One evening at dusk, Nathan invited Erick, Vanessa, and Taylor over to his home court for a few games. As the sun went down, Junebugs began falling onto the court — resulting in a few accidental casualties along the way.</p>
    <p>In the middle of it all, Nathan joked that Jesus must be calling up those Junebugs for His pickleball team in Heaven.</p>
    <p>After the games wrapped up and everyone headed home, Nathan sent out a Junebug Pickleball Club logo to the group as a joke.</p>
    <p>But it did not stay a joke for long.</p>
    <p>That moment became the birth of Junebug Pickleball Club.</p>
    <p>Today, Junebug has grown into an organized club of 25 pickleball addicted members — or better yet, 25 close friends. We are a group of like minded individuals who share a love for the game, a belief in kindness, and a passion for good hearted competition.</p>
    <p>From those early days at The Hideout to structured league play, team competitions, and club versus club events, Junebug continues to grow while staying true to what brought us together in the first place.</p>
    <p class="about-closing">A love for the game.<br>A respect for each other.<br>And a community that feels like family.</p>
    <p class="about-welcome">Welcome to Junebug.</p>
  </div>
</section>

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
