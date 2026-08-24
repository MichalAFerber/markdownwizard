/* Self-hosted, cookieless Plausible page-view count.
 *
 * Loaded only on the real host, deliberately:
 *   - this page is meant to be double-clicked and used offline from file://,
 *     where a hard <script src> to a remote host fails and dirties the console;
 *   - the local test server and pages.dev previews would otherwise report as
 *     production traffic.
 *
 * Kept in its own file rather than inline so the CSP's script-src needs no
 * 'unsafe-inline' — this page has no other inline script, no inline event
 * handlers, and no style attributes, so script-src stays 'self' plus Plausible.
 *
 * The tracker never sees the document: it reports a page view, not content.
 */
(function () {
  if (location.hostname !== 'markdownwizard.app') return;
  var s = document.createElement('script');
  s.defer = true;
  s.dataset.domain = 'markdownwizard.app';
  s.src = 'https://plausible.thompsonblack.us/js/script.outbound-links.file-downloads.tagged-events.js';
  document.head.appendChild(s);
})();
