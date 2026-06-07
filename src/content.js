(() => {
  'use strict';

  const NS = window.GNR;
  if (!NS || !NS.theme || !NS.extractor || !NS.rail) {
    console.error('[GNR] Module dependencies missing; aborting.');
    return;
  }

  const SCROLL_OFFSET = 72;
  const MUTATION_DEBOUNCE_MS = 150;
  const CLICK_LOCK_MS = 500;

  const state = {
    rail: null,
    scroller: null,
    turns: [],
    headingIO: null,
    visibleIds: new Set(),
    mutationTimer: 0,
    chatObserver: null,
    clickLockUntil: 0,
    lastPath: location.pathname,
  };

  function waitFor(selector, timeoutMs = 8000) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        if (performance.now() - t0 > timeoutMs) return resolve(null);
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  async function bootstrap() {
    const anchor = await waitFor('bard-sidenav-content, chat-window');
    if (!anchor) {
      console.warn('[GNR] Could not find mount anchor; bailing.');
      return;
    }

    state.rail = NS.rail.mount();
    if (!state.rail) return;

    state.rail.onItemClick = (heading) => {
      state.clickLockUntil = performance.now() + CLICK_LOCK_MS;
      const target = document.getElementById(heading.id) || heading.el;
      if (!target) return;
      const scroller = ensureScroller();
      if (scroller) {
        const r = target.getBoundingClientRect();
        const sr = scroller.getBoundingClientRect();
        const delta = r.top - sr.top - SCROLL_OFFSET;
        scroller.scrollBy({ top: delta, behavior: 'smooth' });
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      NS.rail.setActive(state.rail, heading.id);
    };

    attachChatObserver();
    attachRouteWatcher();
    scheduleExtract(0);
  }

  function ensureScroller() {
    if (state.scroller && document.contains(state.scroller)) return state.scroller;
    state.scroller = NS.extractor.findScroller();
    return state.scroller;
  }

  function attachChatObserver() {
    if (state.chatObserver) state.chatObserver.disconnect();
    const scroller = ensureScroller();
    if (!scroller) {
      setTimeout(attachChatObserver, 500);
      return;
    }
    state.chatObserver = new MutationObserver((muts) => {
      let relevant = false;
      for (const m of muts) {
        const t = m.target;
        if (!t) continue;
        if (
          t.nodeType === 1 &&
          (t.closest('model-response, [data-test-id="model-response"], message-content, user-query') ||
            t.tagName?.toLowerCase?.() === 'chat-history' ||
            m.addedNodes.length > 0)
        ) {
          relevant = true;
          break;
        }
        if (m.addedNodes.length > 0) {
          relevant = true;
          break;
        }
      }
      if (relevant) scheduleExtract(MUTATION_DEBOUNCE_MS);
    });
    state.chatObserver.observe(scroller, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function scheduleExtract(delay) {
    if (state.mutationTimer) clearTimeout(state.mutationTimer);
    state.mutationTimer = setTimeout(extractAndRender, delay);
  }

  function extractAndRender() {
    state.mutationTimer = 0;
    if (!state.rail) return;

    const pairs = NS.extractor.pairResponsesWithQueries();
    const turns = pairs.map((p) => ({
      responseEl: p.responseEl,
      userQueryText: NS.extractor.extractQueryText(p.queryEl),
      headings: NS.extractor.extractHeadings(p.responseEl, p.index),
      firstParagraph: NS.extractor.extractFirstParagraph(p.responseEl, p.index),
    }));

    state.turns = turns;
    NS.rail.render(state.rail, turns);
    rewireHeadingObserver();
  }

  function rewireHeadingObserver() {
    if (state.headingIO) {
      state.headingIO.disconnect();
      state.headingIO = null;
    }
    state.visibleIds.clear();
    const scroller = ensureScroller();
    if (!scroller) return;

    const allHeadings = state.turns.flatMap((t) => {
      const list = [];
      if (t.firstParagraph) list.push(t.firstParagraph);
      list.push(...t.headings);
      return list;
    });
    if (!allHeadings.length) return;

    state.headingIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.target.id;
          if (e.isIntersecting) state.visibleIds.add(id);
          else state.visibleIds.delete(id);
        }
        updateActiveFromVisible();
      },
      {
        root: scroller,
        rootMargin: `-${SCROLL_OFFSET + 8}px 0px -70% 0px`,
        threshold: 0,
      }
    );

    allHeadings.forEach((h) => {
      if (h.el && document.contains(h.el)) state.headingIO.observe(h.el);
    });
  }

  function updateActiveFromVisible() {
    if (!state.rail) return;
    if (!state.visibleIds.size) return;
    const allHeadings = state.turns.flatMap((t) => {
      const list = [];
      if (t.firstParagraph) list.push(t.firstParagraph);
      list.push(...t.headings);
      return list;
    });
    const firstVisible = allHeadings.find((h) => state.visibleIds.has(h.id));
    if (firstVisible) NS.rail.setActive(state.rail, firstVisible.id);
  }

  function attachRouteWatcher() {
    const fire = () => {
      if (location.pathname !== state.lastPath) {
        state.lastPath = location.pathname;
        if (state.headingIO) state.headingIO.disconnect();
        state.turns = [];
        state.visibleIds.clear();
        NS.rail.render(state.rail, []);
        state.scroller = null;
        setTimeout(() => {
          attachChatObserver();
          scheduleExtract(200);
        }, 300);
      }
    };

    const origPush = history.pushState;
    history.pushState = function () {
      const r = origPush.apply(this, arguments);
      queueMicrotask(fire);
      return r;
    };
    const origReplace = history.replaceState;
    history.replaceState = function () {
      const r = origReplace.apply(this, arguments);
      queueMicrotask(fire);
      return r;
    };
    window.addEventListener('popstate', fire);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
