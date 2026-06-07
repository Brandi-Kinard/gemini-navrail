# Gemini NavRail

A Chrome MV3 extension that injects a native-feeling "Key Moments" rail into [gemini.google.com](https://gemini.google.com/app). As model responses stream in, the rail parses `h2`/`h3` headings (plus standalone bold mini-headers) from every assistant turn and presents them as smooth-scroll anchors in a persistent right-side Material 3 sidebar.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and select this folder.
4. Navigate to `https://gemini.google.com/app` and start a chat that produces structured output — e.g.:

   > Write a structured guide to async Rust. Use H2 sections for Tasks, Channels, and Pinning, and H3 subsections inside each.

The rail appears once a response has 2+ headings detected. Theme matches Gemini's left sidenav automatically.

## File layout

```
gemini-navrail/
├── manifest.json           MV3 manifest, content-script matches
├── src/
│   ├── theme-bridge.js     Reads --bard-color-* tokens, watches dark/light swap
│   ├── heading-extractor.js  Prioritized selector fallbacks, h2/h3 + standalone-bold rule
│   ├── rail.js             Shadow-DOM UI (inlined CSS), collapse stub, active-pill state
│   └── content.js          Orchestrator: MutationObserver + IntersectionObserver + SPA route watch
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   ├── icon-128.png
│   └── _make_icons.py      Regenerates icons via Python stdlib (no PIL needed)
└── README.md
```

Content scripts are loaded in dependency order (`theme-bridge` → `heading-extractor` → `rail` → `content`) and communicate through `window.GNR`.

## Verify selectors after install

The plan flagged the message-level selectors (`model-response`, `user-query`, `message-content`) as unverified — they were inferred from Gemini's compiled custom-element manifest but not observed in a live conversation. Run this in the DevTools console on `gemini.google.com/app` **after sending a prompt with at least one response**:

```js
(() => {
  const r = document.querySelectorAll('model-response, [data-test-id="model-response"], message-content');
  const q = document.querySelectorAll('user-query, [data-test-id="user-query"]');
  const s = document.querySelector('infinite-scroller[data-test-id="chat-history-container"]');
  console.log({
    responseMatches: r.length,
    queryMatches: q.length,
    scrollerFound: !!s,
    firstResponseTag: r[0]?.tagName,
    firstResponseHeadings: r[0] ? Array.from(r[0].querySelectorAll('h1,h2,h3')).map(h => h.tagName + ': ' + h.textContent.slice(0, 60)) : [],
    firstQueryText: q[0]?.textContent?.slice(0, 80),
  });
})();
```

Paste the output. If `responseMatches` or `queryMatches` is 0, the extractor's primary selector list needs adjustment — the rail will already warn in the console (`[GNR] Primary selector ... missed`).

## Architecture notes

- **Shadow DOM** wraps every rail style — Gemini's 1,700+ CSS vars cannot leak in, our styles cannot leak out.
- **Theme tracking** uses `--bard-color-sidenav-background-desktop` (resolved on `body`, flips with `body.dark-theme`). A `MutationObserver` on `body[class]` re-pulls the value on theme change, no flicker.
- **Stable IDs** are written back onto each heading element (`gnr-{turn}-{index}-{hash}`) so anchors survive streaming re-renders.
- **Streaming-safe MutationObserver** uses a 150ms trailing debounce and bails early on mutations that have no `model-response` ancestor.
- **Scroll-spy** uses `IntersectionObserver` rooted on the chat scroller with `rootMargin: "-80px 0px -70% 0px"` so the active anchor matches where your eye is, not the top of the viewport.
- **SPA route changes** are intercepted by monkey-patching `history.pushState` / `replaceState` and listening for `popstate`. Switching conversations clears the turn map and rebuilds.
- **Selector fallbacks**: every Gemini selector has a prioritized list. Falling past the first option emits a single `console.warn` — that's the canary for a Google rename.

## Known risks (from plan)

- `model-response` / `user-query` selectors are unverified against a real conversation. First post-install task is the verify snippet above.
- Smooth-scroll could fight with Gemini's auto-scroll-to-bottom during streaming. A 500ms click-lock guards anchor clicks, but heavy streaming may still feel jumpy.
- Mobile viewports < 1100px hide the rail entirely.

## Roadmap if it lands

- Per-turn collapse (fold older turns when conversation gets long).
- Drag-to-resize.
- Keyboard navigation (`j`/`k` between anchors).
- Export current turn as Markdown TOC.
