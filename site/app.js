/* =========================================================================
   Shared behaviour for every page: the mobile nav.
   ========================================================================= */
(function(){
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
