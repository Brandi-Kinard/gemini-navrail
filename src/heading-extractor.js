(() => {
  'use strict';

  const NS = (window.GNR = window.GNR || {});

  const RESPONSE_SELECTORS = [
    'model-response',
    '[data-test-id="model-response"]',
    'message-content',
    '.model-response-container',
  ];

  const QUERY_SELECTORS = [
    'user-query',
    '[data-test-id="user-query"]',
    '.user-query-container',
  ];

  const SCROLLER_SELECTORS = [
    'infinite-scroller[data-test-id="chat-history-container"]',
    '[data-test-id="chat-history-container"]',
  ];

  // Gemini renders accessibility/chrome labels as real headings inside model-response
  // (e.g. an <h2> "Gemini said" above every answer). Strip them so they don't pollute the TOC.
  const UI_LABEL_PATTERNS = [
    /^Gemini\s+said\b[\s:.…]*$/i,
  ];

  function isUiLabel(text) {
    return UI_LABEL_PATTERNS.some((re) => re.test(text));
  }

  let warnedPast = new Set();

  function firstMatch(selectors, root = document) {
    for (let i = 0; i < selectors.length; i++) {
      const el = root.querySelector(selectors[i]);
      if (el) {
        if (i > 0 && !warnedPast.has(selectors[0])) {
          warnedPast.add(selectors[0]);
          console.warn(`[GNR] Primary selector "${selectors[0]}" missed; using fallback "${selectors[i]}". Possible Gemini update.`);
        }
        return el;
      }
    }
    return null;
  }

  function allMatches(selectors, root = document) {
    for (let i = 0; i < selectors.length; i++) {
      const list = root.querySelectorAll(selectors[i]);
      if (list.length) {
        if (i > 0 && !warnedPast.has(selectors[0])) {
          warnedPast.add(selectors[0]);
          console.warn(`[GNR] Primary selector "${selectors[0]}" missed; using fallback "${selectors[i]}". Possible Gemini update.`);
        }
        return Array.from(list);
      }
    }
    return [];
  }

  function findScroller() {
    const direct = firstMatch(SCROLLER_SELECTORS);
    if (direct) return direct;
    const cwc = document.querySelector('chat-window-content');
    if (!cwc) return null;
    const scrollers = Array.from(cwc.querySelectorAll('infinite-scroller'));
    if (!scrollers.length) return null;
    return scrollers.reduce((a, b) =>
      b.getBoundingClientRect().height > a.getBoundingClientRect().height ? b : a
    );
  }

  function findResponses() {
    return allMatches(RESPONSE_SELECTORS);
  }

  function findUserQueries() {
    return allMatches(QUERY_SELECTORS);
  }

  function hashText(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36).slice(0, 6);
  }

  function isStandaloneBold(strong) {
    const parent = strong.parentElement;
    if (!parent) return false;
    if (!parent.matches('p, li')) return false;
    if (parent.closest('code, pre')) return false;
    const ownText = strong.textContent.trim();
    if (ownText.length < 2 || ownText.length > 140) return false;
    const parentText = parent.textContent.trim();
    if (ownText !== parentText) return false;
    if (/[.!?]$/.test(ownText) && ownText.split(/\s+/).length > 12) return false;
    return true;
  }

  function extractHeadings(responseEl, turnIndex) {
    if (!responseEl) return [];
    const seen = new Set();
    const out = [];
    const push = (el, level) => {
      if (!el || seen.has(el)) return;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      if (isUiLabel(text)) return;
      seen.add(el);
      let id = el.id;
      if (!id || !id.startsWith('gnr-')) {
        id = `gnr-${turnIndex}-${out.length}-${hashText(text)}`;
        el.id = id;
      }
      out.push({ id, text, level, el });
    };

    responseEl.querySelectorAll('h1, h2, h3').forEach((h) => {
      const tag = h.tagName.toLowerCase();
      push(h, tag === 'h1' ? 1 : tag === 'h2' ? 2 : 3);
    });

    responseEl.querySelectorAll('strong, b').forEach((s) => {
      if (isStandaloneBold(s)) {
        const container = s.parentElement;
        push(container, 4);
      }
    });

    out.sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    return out;
  }

  function extractFirstParagraph(responseEl, turnIndex) {
    if (!responseEl) return null;
    const ps = responseEl.querySelectorAll('p');
    for (const p of ps) {
      if (p.closest('code, pre')) continue;
      const text = (p.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || isUiLabel(text)) continue;
      let id = p.id;
      if (!id || !id.startsWith('gnr-')) {
        id = `gnr-${turnIndex}-top-${hashText(text)}`;
        p.id = id;
      }
      return { id, text, el: p };
    }
    return null;
  }

  // Gemini prefixes the user-query element's text with an accessibility label
  // (e.g. "You said" followed by the actual prompt). Strip it.
  const QUERY_PREFIX_PATTERNS = [
    /^You\s+said\b[\s:.…]*/i,
  ];

  function stripQueryPrefix(text) {
    let out = text;
    for (const re of QUERY_PREFIX_PATTERNS) {
      out = out.replace(re, '');
    }
    return out.trim();
  }

  function extractQueryText(queryEl) {
    if (!queryEl) return '';
    const inner = queryEl.querySelector('.query-text, [data-test-id="query-text"], p, span');
    let text = (inner || queryEl).textContent.replace(/\s+/g, ' ').trim();
    text = stripQueryPrefix(text);
    return text.slice(0, 100);
  }

  function pairResponsesWithQueries() {
    const responses = findResponses();
    const queries = findUserQueries();
    const pairs = [];
    responses.forEach((respEl, i) => {
      let queryEl = null;
      for (let j = queries.length - 1; j >= 0; j--) {
        const q = queries[j];
        const pos = q.compareDocumentPosition(respEl);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
          queryEl = q;
          break;
        }
      }
      pairs.push({ index: i, responseEl: respEl, queryEl });
    });
    return pairs;
  }

  NS.extractor = {
    findScroller,
    findResponses,
    findUserQueries,
    extractHeadings,
    extractFirstParagraph,
    extractQueryText,
    pairResponsesWithQueries,
  };
})();
