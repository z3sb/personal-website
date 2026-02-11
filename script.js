(() => {
  const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  // ========================================
  // Three.js Interactive Particle Sphere
  // ========================================
  function initHeroCanvas() {
    if (!motionOk) return;
    if (typeof THREE === 'undefined') return;

    const canvas = document.getElementById('hero-canvas');
    const hero = document.getElementById('hero');
    if (!canvas || !hero) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    } catch (e) {
      return;
    }
    if (!renderer.getContext()) return;

    hero.classList.add('webgl-active');

    const isMobile = !finePointer;
    const PARTICLE_COUNT = isMobile ? 500 : 1200;
    const CONNECTION_CAP = isMobile ? 100 : 300;
    const SPHERE_RADIUS = isMobile ? 1.6 : 2.0;
    const CONNECTION_DIST = 0.6;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(hero.clientWidth, hero.clientHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, hero.clientWidth / hero.clientHeight, 0.1, 100);
    camera.position.z = isMobile ? 6 : 5.5;

    // -- Particle positions via Fibonacci spiral --
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const offsets = new Float32Array(PARTICLE_COUNT); // twinkle offset
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

    // -- Particles --
    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeom.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));

    const particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#c9a84c') },
        uPixelRatio: { value: renderer.getPixelRatio() }
      },
      vertexShader: `
        attribute float aOffset;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (3.0 * uPixelRatio) / -mvPos.z;
          gl_Position = projectionMatrix * mvPos;
          vAlpha = 0.5 + 0.5 * sin(uTime * 1.5 + aOffset);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float strength = 1.0 - smoothstep(0.0, 0.5, d);
          gl_FragColor = vec4(uColor, strength * vAlpha * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // -- Connection lines --
    const linePositions = [];
    let lineCount = 0;
    for (let i = 0; i < PARTICLE_COUNT && lineCount < CONNECTION_CAP; i++) {
      const ax = positions[i * 3], ay = positions[i * 3 + 1], az = positions[i * 3 + 2];
      for (let j = i + 1; j < PARTICLE_COUNT && lineCount < CONNECTION_CAP; j++) {
        const bx = positions[j * 3], by = positions[j * 3 + 1], bz = positions[j * 3 + 2];
        const dx = ax - bx, dy = ay - by, dz = az - bz;
        if (dx * dx + dy * dy + dz * dz < CONNECTION_DIST * CONNECTION_DIST) {
          linePositions.push(ax, ay, az, bx, by, bz);
          lineCount++;
        }
      }
    }

    if (linePositions.length) {
      const lineGeom = new THREE.BufferGeometry();
      lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xc9a84c,
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const lines = new THREE.LineSegments(lineGeom, lineMat);
      scene.add(lines);
      // Sync rotation with particles
      particles.add(lines);
      // Re-parent so lines rotate with the particle group
      scene.remove(lines);
    }

    // -- Inner glow sphere --
    const glowGeom = new THREE.SphereGeometry(SPHERE_RADIUS * 0.85, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#c9a84c') }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          float pulse = 0.12 + 0.03 * sin(uTime * 0.8);
          gl_FragColor = vec4(uColor, intensity * pulse);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    particles.add(glow);

    // -- Mouse tracking (desktop only) --
    let mouseX = 0, mouseY = 0;
    let targetRotX = 0, targetRotY = 0;

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

    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !animationId) tick();
      },
      { threshold: 0 }
    );
    heroObserver.observe(hero);

    const clock = new THREE.Clock();

    function tick() {
      if (!isVisible) { animationId = null; return; }
      animationId = requestAnimationFrame(tick);

      const elapsed = clock.getElapsedTime();
      particleMat.uniforms.uTime.value = elapsed;
      glowMat.uniforms.uTime.value = elapsed;

      // Auto-rotation
      particles.rotation.y += 0.05 / 60;
      particles.rotation.x = Math.sin(elapsed * 0.15) * 0.05;

      // Mouse follow
      if (finePointer) {
        targetRotX = mouseY * 0.3;
        targetRotY = mouseX * 0.3;
        particles.rotation.x += (targetRotX - particles.rotation.x) * 0.02;
        particles.rotation.y += (targetRotY - particles.rotation.y) * 0.02;
      }

      renderer.render(scene, camera);
    }

    tick();

    // -- Resize handler --
    window.addEventListener('resize', () => {
      const w = hero.clientWidth;
      const h = hero.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
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
  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';

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
