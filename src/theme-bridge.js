(() => {
  'use strict';

  const NS = (window.GNR = window.GNR || {});

  const FALLBACKS = {
    light: {
      surface: '#e9eef6',
      surfaceHover: '#f3f6fc',
      primaryContainer: '#d3e3fd',
      onSurface: '#1f1f1f',
      onSurfaceVariant: '#444746',
      outlineVariant: '#c4c7c5',
      primary: '#0b57d0',
    },
    dark: {
      surface: '#1e1f20',
      surfaceHover: '#222327',
      primaryContainer: '#0842a0',
      onSurface: '#e3e3e3',
      onSurfaceVariant: '#c4c7c5',
      outlineVariant: '#3c4043',
      primary: '#a8c7fa',
    },
  };

  function isDark() {
    return document.body.classList.contains('dark-theme');
  }

  function readVar(name) {
    const v = getComputedStyle(document.body).getPropertyValue(name).trim();
    return v || null;
  }

  function currentPalette() {
    const dark = isDark();
    const fb = dark ? FALLBACKS.dark : FALLBACKS.light;
    return {
      surface: readVar('--bard-color-sidenav-background-desktop') || fb.surface,
      surfaceHover: readVar('--bard-color-response-container-flipped-background') || fb.surfaceHover,
      primaryContainer: fb.primaryContainer,
      onSurface: fb.onSurface,
      onSurfaceVariant: fb.onSurfaceVariant,
      outlineVariant: fb.outlineVariant,
      primary: fb.primary,
      dark,
    };
  }

  function applyPalette(hostEl, palette) {
    const s = hostEl.style;
    s.setProperty('--gnr-surface', palette.surface);
    s.setProperty('--gnr-surface-hover', palette.surfaceHover);
    s.setProperty('--gnr-primary-container', palette.primaryContainer);
    s.setProperty('--gnr-on-surface', palette.onSurface);
    s.setProperty('--gnr-on-surface-variant', palette.onSurfaceVariant);
    s.setProperty('--gnr-outline-variant', palette.outlineVariant);
    s.setProperty('--gnr-primary', palette.primary);
    s.setProperty('color-scheme', palette.dark ? 'dark' : 'light');
  }

  function watchTheme(hostEl) {
    const sync = () => applyPalette(hostEl, currentPalette());
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }

  NS.theme = { currentPalette, applyPalette, watchTheme, isDark };
})();
