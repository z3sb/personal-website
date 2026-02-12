(() => {
  const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  // ========================================
  // Canvas 2D Interactive Particle Sphere
  // ========================================
  function initHeroCanvas() {
    if (!motionOk) return;

    const canvas = document.getElementById('hero-canvas');
    const hero = document.getElementById('hero');
    if (!canvas || !hero) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    hero.classList.add('webgl-active');

    const isMobile = !finePointer;
    const PARTICLE_COUNT = isMobile ? 500 : 1200;
    const CONNECTION_CAP = isMobile ? 100 : 300;
    const SPHERE_RADIUS = isMobile ? 1.6 : 2.0;
    const CONNECTION_DIST = 0.6;
    const FOV = isMobile ? 6 : 5.5;
    const DPR = Math.min(window.devicePixelRatio, 2);

    // -- Sizing --
    function resize() {
      const w = hero.clientWidth;
      const h = hero.clientHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    }
    resize();

    // -- Particle positions via Fibonacci spiral --
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const offsets = new Float32Array(PARTICLE_COUNT);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;
      positions[i * 3] = Math.cos(theta) * radiusAtY * SPHERE_RADIUS;
      positions[i * 3 + 1] = y * SPHERE_RADIUS;
      positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * SPHERE_RADIUS;
      offsets[i] = Math.random() * Math.PI * 2;
    }

    // -- Connection pairs (pre-computed) --
    const connections = [];
    let lineCount = 0;
    for (let i = 0; i < PARTICLE_COUNT && lineCount < CONNECTION_CAP; i++) {
      const ax = positions[i * 3], ay = positions[i * 3 + 1], az = positions[i * 3 + 2];
      for (let j = i + 1; j < PARTICLE_COUNT && lineCount < CONNECTION_CAP; j++) {
        const bx = positions[j * 3], by = positions[j * 3 + 1], bz = positions[j * 3 + 2];
        const dx = ax - bx, dy = ay - by, dz = az - bz;
        if (dx * dx + dy * dy + dz * dz < CONNECTION_DIST * CONNECTION_DIST) {
          connections.push(i, j);
          lineCount++;
        }
      }
    }

    // -- Projected buffer (x, y, depth, scale per particle) --
    const projected = new Float32Array(PARTICLE_COUNT * 4);

    // -- Color LUT for quantized alpha (avoids per-particle string alloc) --
    const ALPHA_STEPS = 20;
    const colorLUT = new Array(ALPHA_STEPS + 1);
    for (let i = 0; i <= ALPHA_STEPS; i++) {
      const a = (i / ALPHA_STEPS * 0.8).toFixed(3);
      colorLUT[i] = 'rgba(201,168,76,' + a + ')';
    }

    // -- Rotation state --
    let rotX = 0;
    let rotY = 0;
    let mouseX = 0, mouseY = 0;

    if (finePointer) {
      hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      });
    }

    // -- Render loop with IntersectionObserver pause --
    let isVisible = true;
    let animationId = null;
    const startTime = performance.now();

    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !animationId) tick();
      },
      { threshold: 0 }
    );
    heroObserver.observe(hero);

    function tick() {
      if (!isVisible) { animationId = null; return; }
      animationId = requestAnimationFrame(tick);

      const elapsed = (performance.now() - startTime) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.35;

      // Auto-rotation
      rotY += 0.05 / 60;

      if (finePointer) {
        const targetRotX = mouseY * 0.3;
        const targetRotY = mouseX * 0.3;
        rotX += (targetRotX - rotX) * 0.02;
        rotY += (targetRotY - rotY) * 0.02;
      } else {
        rotX = Math.sin(elapsed * 0.15) * 0.05;
      }

      // Pre-compute trig once per frame
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      // Project all particles
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ox = positions[i * 3];
        const oy = positions[i * 3 + 1];
        const oz = positions[i * 3 + 2];

        // Y rotation
        const rx = ox * cosY + oz * sinY;
        const ry = oy;
        const rz = -ox * sinY + oz * cosY;

        // X rotation
        const fx = rx;
        const fy = ry * cosX - rz * sinX;
        const fz = ry * sinX + rz * cosX;

        const perspective = FOV / (FOV + fz);
        const idx = i * 4;
        projected[idx] = cx + fx * R * perspective;
        projected[idx + 1] = cy - fy * R * perspective;
        projected[idx + 2] = fz;
        projected[idx + 3] = perspective;
      }

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Layer 1: Inner glow
      const pulse = 0.12 + 0.03 * Math.sin(elapsed * 0.8);
      const glowRadius = R * 0.85;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      grad.addColorStop(0, 'rgba(201,168,76,0)');
      grad.addColorStop(0.7, 'rgba(201,168,76,' + (pulse * 0.3).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(201,168,76,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - glowRadius, cy - glowRadius, glowRadius * 2, glowRadius * 2);

      // Layer 2: Connection lines (single draw call)
      if (connections.length) {
        ctx.beginPath();
        for (let c = 0; c < connections.length; c += 2) {
          const ai = connections[c] * 4;
          const bi = connections[c + 1] * 4;
          ctx.moveTo(projected[ai], projected[ai + 1]);
          ctx.lineTo(projected[bi], projected[bi + 1]);
        }
        ctx.strokeStyle = 'rgba(201,168,76,0.06)';
        ctx.lineWidth = DPR;
        ctx.stroke();
      }

      // Layer 3: Particles (additive blending)
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 4;
        const sx = projected[idx];
        const sy = projected[idx + 1];
        const scale = projected[idx + 3];
        const twinkle = 0.5 + 0.5 * Math.sin(elapsed * 1.5 + offsets[i]);
        const alphaIdx = Math.round(twinkle * ALPHA_STEPS);
        const radius = Math.max(1.5 * DPR * scale, 0.5);

        ctx.fillStyle = colorLUT[alphaIdx];
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    tick();

    // -- Resize handler --
    window.addEventListener('resize', resize);
  }

  initHeroCanvas();

  // ========================================
  // Mobile menu toggle
  // ========================================
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

  // ========================================
  // Step 1: Hero Text Scramble/Decode Effect
  // ========================================
  const isRTL = document.documentElement.dir === 'rtl';
  const SCRAMBLE_CHARS = isRTL
    ? 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'
    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';

  function scrambleText(element, finalText, duration) {
    return new Promise((resolve) => {
      element.classList.add('scrambling');
      const length = finalText.length;
      const startTime = performance.now();

      function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        let display = '';
        for (let i = 0; i < length; i++) {
          if (finalText[i] === ' ' || finalText[i] === '.') {
            display += finalText[i];
          } else {
            // Each character resolves at a staggered time
            const charProgress = (progress * length - i) / 3;
            if (charProgress >= 1) {
              display += finalText[i];
            } else if (charProgress > 0) {
              display += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            } else {
              display += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            }
          }
        }

        element.textContent = display;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          element.textContent = finalText;
          element.classList.remove('scrambling');
          resolve();
        }
      }

      requestAnimationFrame(update);
    });
  }

  // ========================================
  // Hero load sequence (with scramble integration)
  // ========================================
  const heroTagline = document.querySelector('.hero-tagline');
  const taglineText = heroTagline ? heroTagline.textContent : '';

  if (motionOk) {
    document.querySelectorAll('[data-hero]').forEach((el, i) => {
      setTimeout(() => {
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 200 + i * 200);
    });

    // Trigger scramble after the hero stagger completes
    const heroEls = document.querySelectorAll('[data-hero]');
    const scrambleDelay = 200 + heroEls.length * 200 + 600; // after last element finishes animating
    if (heroTagline) {
      setTimeout(() => {
        scrambleText(heroTagline, taglineText, 1500);
      }, scrambleDelay);
    }
  } else {
    document.querySelectorAll('[data-hero]').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  // ========================================
  // Scroll animations (fade-up + section-title reveal)
  // ========================================
  const fadeEls = document.querySelectorAll('.fade-up');
  const sectionTitles = document.querySelectorAll('.section-title');

  if (motionOk) {
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
    sectionTitles.forEach(el => fadeObserver.observe(el));

    // Assign stagger delays to grid children
    document.querySelectorAll('.tech-grid').forEach(grid => {
      grid.querySelectorAll('.fade-up').forEach((el, i) => {
        el.style.setProperty('--delay', i);
      });
    });
  } else {
    fadeEls.forEach(el => el.classList.add('visible'));
    sectionTitles.forEach(el => el.classList.add('visible'));
  }

  // ========================================
  // Active nav highlight
  // ========================================
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

  // ========================================
  // Scroll progress bar
  // ========================================
  if (motionOk) {
    const scrollProgress = document.querySelector('.scroll-progress');
    if (scrollProgress) {
      const updateProgress = () => {
        const docHeight = document.documentElement.scrollHeight;
        const viewHeight = window.innerHeight;
        const scrolled = window.scrollY;
        const progress = (scrolled / (docHeight - viewHeight)) * 100;
        scrollProgress.style.width = progress + '%';
      };
      window.addEventListener('scroll', updateProgress, { passive: true });
    }
  }

  // ========================================
  // Cursor glow (fine pointer only)
  // ========================================
  if (motionOk && finePointer) {
    const glow = document.querySelector('.cursor-glow');
    if (glow) {
      let mouseX = 0;
      let mouseY = 0;
      let rafId = null;

      const updateGlow = () => {
        glow.style.left = mouseX + 'px';
        glow.style.top = mouseY + 'px';
        rafId = null;
      };

      document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!rafId) {
          rafId = requestAnimationFrame(updateGlow);
        }
      });

      document.addEventListener('mouseenter', () => {
        glow.style.opacity = '1';
      });

      document.addEventListener('mouseleave', () => {
        glow.style.opacity = '0';
      });
    }
  }

  // ========================================
  // Magnetic buttons (fine pointer only)
  // ========================================
  if (motionOk && finePointer) {
    const buttons = document.querySelectorAll('.btn');
    const maxDist = 60;
    const maxPull = 8;

    buttons.forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const pull = (1 - dist / maxDist) * maxPull;
          const tx = (dx / dist) * pull;
          const ty = (dy / dist) * pull;
          btn.style.transform = `translate(${tx}px, ${ty}px)`;
        }
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transition = 'transform 0.3s ease';
        btn.style.transform = 'translate(0, 0)';
        setTimeout(() => {
          btn.style.transition = '';
        }, 300);
      });
    });
  }

  // ========================================
  // Hero parallax
  // ========================================
  if (motionOk) {
    const heroContainer = document.querySelector('.hero .container');
    const heroSection = document.querySelector('.hero');
    if (heroContainer && heroSection) {
      window.addEventListener('scroll', () => {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        if (window.scrollY < heroBottom) {
          heroContainer.style.transform = `translateY(${window.scrollY * 0.3}px)`;
        }
      }, { passive: true });
    }
  }

  // ========================================
  // Step 4b: 3D Tilt Cards (fine pointer only)
  // ========================================
  if (motionOk && finePointer) {
    const techCards = document.querySelectorAll('.tech-category');

    techCards.forEach(card => {
      // Add shine overlay element
      const shine = document.createElement('div');
      shine.className = 'tilt-shine';
      card.appendChild(shine);

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -10; // max ±10deg
        const rotateY = ((x - centerX) / centerX) * 10;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        // Move shine to follow cursor
        const shineX = (x / rect.width) * 100;
        const shineY = (y / rect.height) * 100;
        shine.style.background = `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.12), transparent 60%)`;
        shine.style.opacity = '1';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0)';
        shine.style.opacity = '0';
      });
    });
  }

  // ========================================
  // Step 6: Oversized Parallax Section Titles
  // ========================================
  if (motionOk) {
    const bgTitles = document.querySelectorAll('.section-title-bg');

    if (bgTitles.length) {
      function updateParallaxTitles() {
        bgTitles.forEach(title => {
          const container = title.parentElement;
          const rect = container.getBoundingClientRect();
          const viewportHeight = window.innerHeight;

          // Only animate when visible
          if (rect.bottom > 0 && rect.top < viewportHeight) {
            const scrollDelta = rect.top - viewportHeight / 2;
            const offset = scrollDelta * 0.15;
            title.style.transform = `translateY(${offset}px)`;
          }
        });
      }

      window.addEventListener('scroll', updateParallaxTitles, { passive: true });
      updateParallaxTitles();
    }
  }

  // ========================================
  // Step 7: Back-to-Top Button
  // ========================================
  const backToTop = document.querySelector('.back-to-top');
  const heroEl = document.getElementById('hero');

  if (backToTop && heroEl) {
    if (motionOk) {
      const topObserver = new IntersectionObserver(
        ([entry]) => {
          backToTop.classList.toggle('visible', !entry.isIntersecting);
        },
        { threshold: 0 }
      );
      topObserver.observe(heroEl);
    }

    backToTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
