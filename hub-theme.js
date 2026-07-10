const TeachTheme = (() => {
  const KEY = 'teach-theme';
  const ICONS = `<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg><svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"/></svg>`;

  function get() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }

  function syncButtons() {
    const light = get() === 'light';
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
      btn.title = light ? 'Dark mode' : 'Light mode';
    });
  }

  function set(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    if (next === 'light') document.documentElement.dataset.theme = 'light';
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(KEY, next);
    syncButtons();
  }

  function toggle() {
    set(get() === 'light' ? 'dark' : 'light');
  }

  function init() {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      if (!btn.innerHTML.trim()) btn.innerHTML = ICONS;
      btn.addEventListener('click', toggle);
    });
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) set(saved);
    } catch (e) {}
    syncButtons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { get, set, toggle };
})();
