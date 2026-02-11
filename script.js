(() => {
  // Mobile menu toggle
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  toggle.addEventListener('click', () => {
    const isOpen = toggle.classList.toggle('is-open');
    navLinks.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen);
    document.body.classList.toggle('menu-open', isOpen);
  });

  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('is-open');
      navLinks.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    });
  });

  // Scroll animations
  const fadeEls = document.querySelectorAll('.fade-up');
  const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (motionOk && fadeEls.length) {
    const fadeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            fadeObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    fadeEls.forEach(el => fadeObserver.observe(el));

    // Assign stagger delays to grid children
    document.querySelectorAll('.card-grid, .tech-grid, .insights-grid').forEach(grid => {
      grid.querySelectorAll('.fade-up').forEach((el, i) => {
        el.style.setProperty('--delay', i);
      });
    });
  } else {
    fadeEls.forEach(el => el.classList.add('visible'));
  }

  // Active nav highlight
  const sections = document.querySelectorAll('section[id], footer[id]');
  const navItems = document.querySelectorAll('.nav-link');

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navItems.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    },
    { rootMargin: '-40% 0px -60% 0px' }
  );
  sections.forEach(section => navObserver.observe(section));
})();
