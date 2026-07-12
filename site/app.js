/* =========================================================================
   Shared behaviour for every page: the i18n engine and the mobile nav.
   English stays authoritative in the HTML; each page supplies only its Dutch
   as window.I18N_NL / window.I18N_NL_PH BEFORE this script loads.
   Pages with dynamic content (the homepage widget) may expose
   window.__renderDynamic() so we can repaint counters after a language swap.
   ========================================================================= */
(function(){
  // ---- i18n ---------------------------------------------------------------
  const NL    = window.I18N_NL    || {};
  const NL_PH = window.I18N_NL_PH || {};

  const nodes = [];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    nodes.push({ el, key: el.getAttribute('data-i18n'), en: el.innerHTML });
  });
  const phNodes = [];
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    phNodes.push({ el, key: el.getAttribute('data-i18n-ph'), en: el.getAttribute('placeholder') || '' });
  });
  const btns = Array.from(document.querySelectorAll('.lang-toggle [data-lang]'));

  function setLang(lang, push){
    if (lang !== 'nl') lang = 'en';
    document.documentElement.lang = lang;
    nodes.forEach(n => { n.el.innerHTML = (lang === 'nl' && NL[n.key] != null) ? NL[n.key] : n.en; });
    phNodes.forEach(n => { n.el.setAttribute('placeholder', (lang === 'nl' && NL_PH[n.key] != null) ? NL_PH[n.key] : n.en); });
    btns.forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)));
    try { localStorage.setItem('lang', lang); } catch (e) {}
    if (push){
      const u = new URL(location.href);
      if (lang === 'nl') u.searchParams.set('lang', 'nl'); else u.searchParams.delete('lang');
      history.replaceState(null, '', u);
    }
    // Counters/charts may live inside swapped nodes — let the page repaint them.
    if (window.__renderDynamic) window.__renderDynamic();
  }

  btns.forEach(b => b.addEventListener('click', () => setLang(b.getAttribute('data-lang'), true)));

  // Precedence: ?lang= wins, then a remembered choice, then browser language.
  let initial = 'en';
  try {
    const urlLang = new URL(location.href).searchParams.get('lang');
    const stored  = localStorage.getItem('lang');
    if (urlLang === 'nl' || urlLang === 'en') initial = urlLang;
    else if (stored === 'nl' || stored === 'en') initial = stored;
    else if ((navigator.language || '').toLowerCase().startsWith('nl')) initial = 'nl';
  } catch (e) {}
  setLang(initial, false);

  // ---- mobile nav ---------------------------------------------------------
  const nav = document.querySelector('.site-nav');
  const toggle = nav && nav.querySelector('.nav-toggle');
  if (nav && toggle){
    const close = () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
})();
