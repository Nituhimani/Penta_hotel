// Penta Restaurant — tiny interactions

(() => {
  'use strict';

  // Footer year
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Reveal animations (used across pages)
  const revealTargets = document.querySelectorAll('.reveal, .section, .section-card, .event-card, .gallery-card, .menu-section');
  if (!revealTargets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.16 }
  );

  revealTargets.forEach((el) => {
    el.classList.add('reveal');
    observer.observe(el);
  });
})();

