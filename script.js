// ===== Toddler Off Screen — interactions =====

// Logo → always scroll to the very top (avoids the sticky-header offset creep)
document.querySelector('.nav__brand')?.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Mobile nav toggle
const toggle = document.getElementById('navToggle');
const links = document.getElementById('navLinks');
toggle?.addEventListener('click', () => links.classList.toggle('open'));
links?.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => links.classList.remove('open'))
);

// Newsletter (front-end only — wire to a real service later)
const form = document.getElementById('newsletterForm');
const msg = document.getElementById('newsletterMsg');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  if (!email) return;
  msg.textContent = '🎉 You\'re on the list! We\'ll be in touch soon.';
  form.reset();
});

// ===== Reusable media gallery (ABC + Egg) with arrow nav + lightbox =====
const lightbox = document.getElementById('lightbox');
const lightboxStage = document.getElementById('lightboxStage');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');

let activeGallery = null; // gallery instance currently open in the lightbox

function pauseAllVideos(root) {
  root.querySelectorAll('video').forEach(v => { v.pause(); });
}

// Touch-swipe navigation: swipe LEFT → onNext, swipe RIGHT → onPrev.
// Only fires when the gesture is clearly horizontal so vertical page
// scrolling still works. `touch-action: pan-y` (set in CSS) lets the
// browser keep vertical scroll while we capture horizontal swipes.
function attachSwipeNav(el, onPrev, onNext) {
  if (!el) return;
  const THRESHOLD = 45; // px of horizontal travel to count as a swipe
  let startX = 0;
  let startY = 0;
  let tracking = false;

  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { tracking = false; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  el.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.abs(dx) < THRESHOLD) return;      // too small — ignore
    if (Math.abs(dx) <= Math.abs(dy)) return;  // not predominantly horizontal — let it scroll
    if (dx < 0) onNext();                       // swipe left → next
    else onPrev();                              // swipe right → previous
  }, { passive: true });

  el.addEventListener('touchcancel', () => { tracking = false; }, { passive: true });
}

function renderLightbox(gallery) {
  const slide = gallery.slides[gallery.index];
  const type = slide.dataset.type;
  const src = slide.dataset.full;
  lightboxStage.innerHTML = '';
  if (type === 'video') {
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.playsInline = true;
    video.autoplay = true;
    lightboxStage.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = src;
    img.alt = slide.querySelector('img')?.alt || '';
    lightboxStage.appendChild(img);
  }
}

function openLightbox(gallery) {
  activeGallery = gallery;
  renderLightbox(gallery);
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  pauseAllVideos(lightboxStage);
  lightboxStage.innerHTML = '';
  document.body.style.overflow = '';
  activeGallery = null;
}

function initGallery(root) {
  const viewer = root.querySelector('[data-gallery-viewer]');
  const slides = Array.from(root.querySelectorAll('.gallery__slide'));
  const thumbs = Array.from(root.querySelectorAll('.gallery__thumb'));
  const prevBtn = root.querySelector('[data-gallery-prev]');
  const nextBtn = root.querySelector('[data-gallery-next]');
  const strip = root.querySelector('[data-gallery-strip]');
  const thumbsTrack = root.querySelector('[data-gallery-thumbs]');
  const thumbsPrev = root.querySelector('[data-gallery-thumbs-prev]');
  const thumbsNext = root.querySelector('[data-gallery-thumbs-next]');
  if (!slides.length) return;

  const gallery = { root, slides, index: 0 };

  // Show the thumb-strip arrows only when the thumbs actually overflow
  function updateStripOverflow() {
    if (!strip || !thumbsTrack) return;
    const overflows = thumbsTrack.scrollWidth - thumbsTrack.clientWidth > 2;
    strip.classList.toggle('has-overflow', overflows);
  }

  function scrollActiveThumbIntoView() {
    const active = thumbs[gallery.index];
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  function show(i) {
    gallery.index = (i + slides.length) % slides.length; // wrap-around
    slides.forEach((s, n) => s.classList.toggle('is-active', n === gallery.index));
    thumbs.forEach((t, n) => t.classList.toggle('is-active', n === gallery.index));
    pauseAllVideos(viewer);
    scrollActiveThumbIntoView();
    if (activeGallery === gallery) renderLightbox(gallery);
  }

  prevBtn?.addEventListener('click', () => show(gallery.index - 1));
  nextBtn?.addEventListener('click', () => show(gallery.index + 1));

  // Touch-swipe on the inline main viewer (works over image + video frame)
  attachSwipeNav(viewer, () => show(gallery.index - 1), () => show(gallery.index + 1));

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => show(Number(thumb.dataset.index)));
  });

  // Thumbnail-strip side arrows: scroll roughly one thumbnail-width per tap
  function stripStep() {
    const firstThumb = thumbs[0];
    const gap = 12;
    return firstThumb ? firstThumb.offsetWidth + gap : thumbsTrack.clientWidth * 0.8;
  }
  thumbsPrev?.addEventListener('click', () => thumbsTrack?.scrollBy({ left: -stripStep(), behavior: 'smooth' }));
  thumbsNext?.addEventListener('click', () => thumbsTrack?.scrollBy({ left: stripStep(), behavior: 'smooth' }));

  updateStripOverflow();
  window.addEventListener('resize', updateStripOverflow);

  // Click the current image (not video) to enlarge in the lightbox
  slides.forEach(slide => {
    if (slide.dataset.type === 'video') return;
    slide.addEventListener('click', () => openLightbox(gallery));
  });

  show(0);
  return gallery;
}

document.querySelectorAll('[data-gallery]').forEach(initGallery);

lightboxPrev?.addEventListener('click', () => {
  if (activeGallery) activeGallery.root.querySelector('[data-gallery-prev]').click();
});
lightboxNext?.addEventListener('click', () => {
  if (activeGallery) activeGallery.root.querySelector('[data-gallery-next]').click();
});
// Touch-swipe on the lightbox stage (image + video frame)
attachSwipeNav(
  lightboxStage,
  () => { if (activeGallery) lightboxPrev?.click(); },
  () => { if (activeGallery) lightboxNext?.click(); }
);

lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (!lightbox || lightbox.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowLeft') lightboxPrev?.click();
  else if (e.key === 'ArrowRight') lightboxNext?.click();
});

// Current year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Subtle reveal on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'none';
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.card, .product, .step, .quote, .faq__item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(18px)';
  el.style.transition = 'opacity .5s ease, transform .5s ease';
  io.observe(el);
});
