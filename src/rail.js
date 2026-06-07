(() => {
  'use strict';

  const NS = (window.GNR = window.GNR || {});
  const HOST_ID = 'gnr-rail-host';
  const STORAGE_COLLAPSED = 'gnr.collapsed';

  const ICON_CHEVRON =
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6z"/></svg>';
  const ICON_SPARKLE =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
      '<path fill="currentColor" d="M18.5 23C18.4 23 18.3333 22.95 18.3 22.85C18.0333 21.8333 17.5292 20.9542 16.7875 20.2125C16.0458 19.4708 15.1667 18.9667 14.15 18.7C14.05 18.6667 14 18.6 14 18.5C14 18.3833 14.05 18.3167 14.15 18.3C15.1667 18.0333 16.0458 17.5292 16.7875 16.7875C17.5292 16.0458 18.0333 15.1667 18.3 14.15C18.3333 14.05 18.4 14 18.5 14C18.6 14 18.6667 14.05 18.7 14.15C18.9667 15.1667 19.4708 16.0458 20.2125 16.7875C20.9542 17.5292 21.8333 18.0333 22.85 18.3C22.95 18.3167 23 18.3833 23 18.5C23 18.6 22.95 18.6667 22.85 18.7C21.8333 18.9667 20.9542 19.4708 20.2125 20.2125C19.4708 20.9542 18.9667 21.8333 18.7 22.85C18.6833 22.95 18.6167 23 18.5 23Z"/>' +
      '<path fill="currentColor" d="M19 3C19.55 3 20.0204 3.19622 20.4121 3.58789C20.8038 3.97956 21 4.45 21 5V13H19V5H5V19H13V21H5C4.45 21 3.97956 20.8038 3.58789 20.4121C3.19622 20.0204 3 19.55 3 19V5C3 4.45 3.19622 3.97956 3.58789 3.58789C3.97956 3.19622 4.45 3 5 3H19ZM13 15V17H7V15H13ZM17 11V13H7V11H17ZM17 7V9H7V7H17Z"/>' +
    '</svg>';

  const ICON_CHAT_BUBBLE =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>';

  function truncate(s, max) {
    if (!s) return '';
    const trimmed = String(s).trim();
    if (trimmed.length <= max) return trimmed;
    return trimmed.slice(0, max - 1).trimEnd() + '…';
  }

  const CSS_TEXT = `
:host {
  --gnr-surface: #e9eef6;
  --gnr-surface-hover: #f3f6fc;
  --gnr-primary-container: #d3e3fd;
  --gnr-on-surface: #1f1f1f;
  --gnr-on-surface-variant: #444746;
  --gnr-outline-variant: #c4c7c5;
  --gnr-primary: #0b57d0;
  --gnr-font: 'Google Sans Text', 'Google Sans', system-ui, -apple-system, sans-serif;
  --gnr-radius-lg: 20px;
  --gnr-radius-md: 12px;
  --gnr-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.08);
  all: initial;
}

* { box-sizing: border-box; }

.gnr-root {
  pointer-events: auto;
  position: fixed;
  top: 80px;
  right: 16px;
  bottom: 96px;
  width: 264px;
  background: var(--gnr-surface);
  color: var(--gnr-on-surface);
  border-radius: var(--gnr-radius-lg);
  font-family: var(--gnr-font);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--gnr-shadow);
  transform: translateX(0);
  opacity: 1;
  transition: transform 240ms cubic-bezier(0.2, 0, 0, 1),
              opacity 200ms ease-out,
              background-color 200ms ease-out;
}

.gnr-root.is-collapsed {
  transform: translateX(calc(100% + 32px));
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 1100px) {
  .gnr-root { display: none; }
  .gnr-stub { display: none !important; }
}

.gnr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px 10px 18px;
  border-bottom: 1px solid var(--gnr-outline-variant);
  flex-shrink: 0;
}

.gnr-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 14px;
  letter-spacing: 0.1px;
  color: var(--gnr-on-surface);
}

.gnr-sparkle {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #9168c0, #5684d1 50%, #1ba1e3);
  color: #fff;
}
.gnr-sparkle svg { width: 14px; height: 14px; }

.gnr-collapse {
  border: 0;
  background: transparent;
  color: var(--gnr-on-surface-variant);
  width: 32px; height: 32px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 120ms ease-out;
}
.gnr-collapse:hover { background: var(--gnr-surface-hover); }
.gnr-collapse:focus-visible {
  outline: 2px solid var(--gnr-primary);
  outline-offset: 1px;
}

.gnr-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 8px 24px 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--gnr-outline-variant) transparent;
}
.gnr-scroll::-webkit-scrollbar { width: 6px; }
.gnr-scroll::-webkit-scrollbar-thumb {
  background: var(--gnr-outline-variant);
  border-radius: 3px;
}
.gnr-scroll::-webkit-scrollbar-track { background: transparent; }

.gnr-turns {
  list-style: none;
  margin: 0;
  padding: 0;
}

.gnr-turn {
  margin: 4px 0 10px 0;
  padding: 4px 0 0 0;
}
.gnr-turn + .gnr-turn {
  border-top: 1px solid var(--gnr-outline-variant);
  margin-top: 10px;
  padding-top: 10px;
}

.gnr-turn-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--gnr-on-surface-variant);
  letter-spacing: 0.1px;
  padding: 6px 12px 8px 10px;
  max-width: 100%;
  min-width: 0;
}

.gnr-turn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--gnr-on-surface-variant);
  flex-shrink: 0;
}
.gnr-turn-icon svg { display: block; }

.gnr-turn-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1 1 auto;
  min-width: 0;
}

.gnr-item-synth .gnr-link {
  color: var(--gnr-on-surface-variant);
  font-size: 12.5px;
  font-style: italic;
}
.gnr-item-synth .gnr-bullet {
  font-style: normal;
  font-size: 14px;
  font-weight: 600;
  color: var(--gnr-on-surface-variant);
}
.gnr-item-synth.is-active .gnr-link {
  background: var(--gnr-primary-container);
  color: var(--gnr-on-surface);
  font-style: italic;
}
.gnr-item-synth.is-active .gnr-bullet { color: var(--gnr-primary); }

.gnr-items {
  list-style: none;
  margin: 0;
  padding: 0;
}

.gnr-item {
  position: relative;
  margin: 1px 0;
}

.gnr-link {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 7px 12px 7px 22px;
  border-radius: var(--gnr-radius-md);
  color: var(--gnr-on-surface);
  text-decoration: none;
  line-height: 1.35;
  transition: background-color 120ms ease-out, color 120ms ease-out;
  cursor: pointer;
}
.gnr-link:hover { background: var(--gnr-surface-hover); }
.gnr-link:focus-visible {
  outline: 2px solid var(--gnr-primary);
  outline-offset: -2px;
}

.gnr-bullet {
  display: inline-flex;
  flex-shrink: 0;
  width: 18px; height: 18px;
  align-items: center;
  justify-content: center;
  color: var(--gnr-on-surface-variant);
  margin-top: 1px;
}

.gnr-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13px;
  word-break: break-word;
}

.gnr-level-3 .gnr-link { padding-left: 38px; font-size: 12.5px; }
.gnr-level-4 .gnr-link { padding-left: 38px; font-size: 12.5px; }

.gnr-item.is-active .gnr-link {
  background: var(--gnr-primary-container);
  color: var(--gnr-on-surface);
}
.gnr-item.is-active .gnr-bullet { color: var(--gnr-primary); }

.gnr-empty {
  color: var(--gnr-on-surface-variant);
  font-size: 12.5px;
  padding: 16px 18px;
  line-height: 1.5;
}

.gnr-fade-top,
.gnr-fade-bottom {
  position: absolute;
  left: 0; right: 0;
  height: 16px;
  pointer-events: none;
  z-index: 1;
}
.gnr-fade-top {
  top: 55px;
  background: linear-gradient(to bottom, var(--gnr-surface), transparent);
}
.gnr-fade-bottom {
  bottom: 0;
  background: linear-gradient(to top, var(--gnr-surface), transparent);
}

.gnr-stub {
  pointer-events: auto;
  position: fixed;
  right: 16px;
  top: 88px;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 0;
  background: var(--gnr-surface);
  color: var(--gnr-on-surface);
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--gnr-shadow);
  transition: background-color 120ms ease-out, transform 200ms cubic-bezier(0.2,0,0,1);
}
.gnr-stub:hover { background: var(--gnr-surface-hover); transform: scale(1.04); }
.gnr-stub.is-visible { display: inline-flex; }
.gnr-stub-icon {
  display: inline-flex;
  width: 22px; height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #9168c0, #5684d1 50%, #1ba1e3);
  color: #fff;
}
.gnr-stub-icon svg { width: 14px; height: 14px; }
`;

  function buildShell(shadow) {
    const style = document.createElement('style');
    style.textContent = CSS_TEXT;
    shadow.appendChild(style);

    const root = document.createElement('aside');
    root.className = 'gnr-root';
    root.setAttribute('role', 'navigation');
    root.setAttribute('aria-label', 'Gemini response navigation');
    root.innerHTML = `
      <header class="gnr-header">
        <span class="gnr-title">
          <span class="gnr-sparkle">${ICON_SPARKLE}</span>
          Key Moments
        </span>
        <button class="gnr-collapse" type="button" aria-label="Collapse rail" title="Collapse">
          ${ICON_CHEVRON}
        </button>
      </header>
      <div class="gnr-fade-top" aria-hidden="true"></div>
      <div class="gnr-scroll">
        <ol class="gnr-turns" aria-live="polite"></ol>
      </div>
      <div class="gnr-fade-bottom" aria-hidden="true"></div>
    `;
    shadow.appendChild(root);

    const stub = document.createElement('button');
    stub.className = 'gnr-stub';
    stub.type = 'button';
    stub.setAttribute('aria-label', 'Expand Key Moments rail');
    stub.title = 'Show Key Moments';
    stub.innerHTML = `<span class="gnr-stub-icon">${ICON_SPARKLE}</span>`;
    shadow.appendChild(stub);

    return { root, stub };
  }

  function mount() {
    const existing = document.getElementById(HOST_ID);
    if (existing) return null;

    const host = document.createElement('div');
    host.id = HOST_ID;
    host.dataset.gnrVersion = '0.1.0';
    host.style.position = 'fixed';
    host.style.inset = '0 0 auto auto';
    host.style.zIndex = '50';
    host.style.pointerEvents = 'none';

    const shadow = host.attachShadow({ mode: 'open' });
    const { root, stub } = buildShell(shadow);

    document.body.appendChild(host);

    NS.theme.watchTheme(host);

    const state = {
      host,
      shadow,
      root,
      stub,
      collapsed: localStorage.getItem(STORAGE_COLLAPSED) === '1',
      activeId: null,
      onItemClick: null,
      _visible: true,
    };

    applyCollapsed(state);

    root.querySelector('.gnr-collapse').addEventListener('click', () => {
      state.collapsed = true;
      localStorage.setItem(STORAGE_COLLAPSED, '1');
      applyCollapsed(state);
    });
    stub.addEventListener('click', () => {
      state.collapsed = false;
      localStorage.setItem(STORAGE_COLLAPSED, '0');
      applyCollapsed(state);
    });

    return state;
  }

  function applyCollapsed(state) {
    state.root.classList.toggle('is-collapsed', state.collapsed);
    state.stub.classList.toggle('is-visible', state.collapsed);
  }

  function setVisible(state, visible) {
    if (state._visible === visible) return;
    state._visible = visible;
    state.host.style.display = visible ? '' : 'none';
  }

  function render(state, turns) {
    const totalAnchors = turns.reduce(
      (n, t) => n + t.headings.length + (t.firstParagraph ? 1 : 0),
      0
    );
    if (totalAnchors < 2) {
      setVisible(state, false);
      return;
    }
    setVisible(state, true);

    const list = state.root.querySelector('.gnr-turns');
    const frag = document.createDocumentFragment();

    turns.forEach((turn, ti) => {
      if (!turn.headings.length && !turn.firstParagraph) return;
      const li = document.createElement('li');
      li.className = 'gnr-turn';

      const fullLabel = turn.userQueryText || `Turn ${ti + 1}`;
      const displayLabel = truncate(fullLabel, 50);

      const label = document.createElement('div');
      label.className = 'gnr-turn-label';
      label.title = fullLabel;
      const labelIcon = document.createElement('span');
      labelIcon.className = 'gnr-turn-icon';
      labelIcon.setAttribute('aria-hidden', 'true');
      labelIcon.innerHTML = ICON_CHAT_BUBBLE;
      const labelText = document.createElement('span');
      labelText.className = 'gnr-turn-text';
      labelText.textContent = displayLabel;
      label.appendChild(labelIcon);
      label.appendChild(labelText);
      li.appendChild(label);

      const ol = document.createElement('ol');
      ol.className = 'gnr-items';

      if (turn.firstParagraph) {
        const synthItem = document.createElement('li');
        synthItem.className = 'gnr-item gnr-item-synth';
        synthItem.dataset.headingId = turn.firstParagraph.id;
        const synthLink = document.createElement('a');
        synthLink.href = `#${turn.firstParagraph.id}`;
        synthLink.className = 'gnr-link';
        const synthBullet = document.createElement('span');
        synthBullet.className = 'gnr-bullet';
        synthBullet.textContent = '↳';
        const synthText = document.createElement('span');
        synthText.className = 'gnr-text';
        synthText.textContent = 'Response';
        synthLink.appendChild(synthBullet);
        synthLink.appendChild(synthText);
        synthLink.title = truncate(turn.firstParagraph.text, 60);
        synthLink.addEventListener('click', (e) => {
          e.preventDefault();
          if (state.onItemClick) state.onItemClick(turn.firstParagraph);
        });
        synthItem.appendChild(synthLink);
        ol.appendChild(synthItem);
      }

      turn.headings.forEach((h) => {
        const item = document.createElement('li');
        item.className = `gnr-item gnr-level-${h.level}`;
        item.dataset.headingId = h.id;

        const link = document.createElement('a');
        link.href = `#${h.id}`;
        link.className = 'gnr-link';
        const text = document.createElement('span');
        text.className = 'gnr-text';
        text.textContent = h.text;
        link.appendChild(text);
        link.title = h.text;
        link.addEventListener('click', (e) => {
          e.preventDefault();
          if (state.onItemClick) state.onItemClick(h);
        });
        item.appendChild(link);
        ol.appendChild(item);
      });

      li.appendChild(ol);
      frag.appendChild(li);
    });

    list.replaceChildren(frag);
    if (state.activeId) setActive(state, state.activeId);
  }

  function setActive(state, headingId) {
    state.activeId = headingId;
    const items = state.root.querySelectorAll('.gnr-item');
    items.forEach((el) => {
      el.classList.toggle('is-active', el.dataset.headingId === headingId);
    });
    const activeEl = state.root.querySelector('.gnr-item.is-active');
    if (activeEl) {
      const scroll = state.root.querySelector('.gnr-scroll');
      const sRect = scroll.getBoundingClientRect();
      const aRect = activeEl.getBoundingClientRect();
      if (aRect.top < sRect.top + 24 || aRect.bottom > sRect.bottom - 24) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  NS.rail = { mount, render, setActive, setVisible };
})();
