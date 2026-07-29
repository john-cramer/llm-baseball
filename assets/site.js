/* LLM Baseball — shared site navigation.
 *
 * The feature manifest lives here so every page renders the same left nav.
 * To add a feature, append one entry to SITE.features.
 *
 * Each page must set two attributes on <body>:
 *   data-root   — relative prefix back to the site root ("" or "../../")
 *   data-nav-id — "home" or the id of the active feature
 */
(function () {
  "use strict";

  var SITE = {
    home: { id: "home", title: "Home", href: "index.html" },
    features: [
      {
        id: "current-rosters",
        title: "Current Rosters",
        href: "features/current-rosters/index.html",
        tag: "New"
      },
      {
        id: "feature-template",
        title: "Feature Template",
        href: "features/feature-template/index.html",
        tag: "Template"
      }
    ]
  };

  function navItem(id, title, href, activeId, tag) {
    var cls = id === activeId ? ' class="active"' : "";
    var tagHtml = tag ? '<span class="nav-tag">' + tag + "</span>" : "";
    return "<li" + cls + '><a href="' + href + '">' + title + tagHtml + "</a></li>";
  }

  function buildNav() {
    var nav = document.getElementById("site-nav");
    if (!nav) return;

    var root = document.body.getAttribute("data-root") || "";
    var activeId = document.body.getAttribute("data-nav-id") || "";

    var html = '<h2 class="nav-heading">Dugout</h2>';
    html += '<ul class="nav-list">';
    html += navItem(SITE.home.id, SITE.home.title, root + SITE.home.href, activeId);
    html += "</ul>";

    html += '<h2 class="nav-heading">Features</h2>';
    html += '<ul class="nav-list">';
    SITE.features.forEach(function (feature) {
      html += navItem(feature.id, feature.title, root + feature.href, activeId, feature.tag);
    });
    html += "</ul>";

    html += '<p class="nav-foot">Series 1 &bull; 2026</p>';

    nav.innerHTML = html;
  }

  document.addEventListener("DOMContentLoaded", buildNav);
})();
