(function () {
  var root = document.documentElement;
  var THEME_KEY = 'excellentman-theme';

  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
  }

  var stored = localStorage.getItem(THEME_KEY);
  if (stored) applyTheme(stored);

  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var current = root.getAttribute('data-theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var isDark = current ? current === 'dark' : prefersDark;
      var next = isDark ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
    });
  }

  var menuBtn = document.getElementById('menuBtn');
  var sidebarClose = document.getElementById('sidebarClose');
  var scrim = document.getElementById('scrim');
  function openSidebar() { document.body.classList.add('sidebar-open'); }
  function closeSidebar() { document.body.classList.remove('sidebar-open'); }
  if (menuBtn) menuBtn.addEventListener('click', openSidebar);
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if (scrim) scrim.addEventListener('click', closeSidebar);

  // Scroll to active nav item on load (persistent desktop sidebar)
  var activeNav = document.querySelector('.sidebar a.active');
  if (activeNav && window.innerWidth >= 1100) {
    activeNav.scrollIntoView({ block: 'center' });
  }

  // Reading progress bar
  var progressBar = document.getElementById('progressBar');
  function updateProgress() {
    if (!progressBar) return;
    var doc = document.documentElement;
    var scrollTop = doc.scrollTop || document.body.scrollTop;
    var scrollHeight = doc.scrollHeight - doc.clientHeight;
    var pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = pct + '%';
  }
  document.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // Keyboard chapter navigation (left/right arrows) on reader pages
  var prevLink = document.querySelector('.chapter-nav-link.prev');
  var nextLink = document.querySelector('.chapter-nav-link.next');
  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (document.body.classList.contains('sidebar-open')) return;
    if (e.key === 'ArrowRight' && nextLink) window.location.href = nextLink.getAttribute('href');
    if (e.key === 'ArrowLeft' && prevLink) window.location.href = prevLink.getAttribute('href');
  });
})();
